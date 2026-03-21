import os
import io
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from exif import Image
import boto3
import psycopg2
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow React (Vite) to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Vercel URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
BUCKET_NAME = "restaurantza_images"

DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize S3 Client
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name="ap-south-1"
)

def convert_to_decimal(coords, ref):
    """Helper to convert EXIF DMS to Decimal Degrees"""
    if not coords or not ref:
        return None
    decimal = coords[0] + coords[1] / 60 + coords[2] / 3600
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

@app.post("/upload")
async def upload_restaurant_photo(file: UploadFile = File(...)):
    # 1. Read file into memory
    file_bytes = await file.read()
    
    # 2. Extract Metadata (EXIF)
    lat, lon, captured_at = None, None, None
    try:
        img = Image(io.BytesIO(file_bytes))
        if img.has_exif:
            # Coordinates
            lat = convert_to_decimal(getattr(img, "gps_latitude", None), getattr(img, "gps_latitude_ref", None))
            lon = convert_to_decimal(getattr(img, "gps_longitude", None), getattr(img, "gps_longitude_ref", None))
            
            # Timestamp
            exif_time = getattr(img, "datetime_original", None)
            if exif_time:
                captured_at = datetime.strptime(exif_time, '%Y:%m:%d %H:%M:%S')
    except Exception as e:
        print(f"EXIF Extraction Error: {e}")

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Photo is missing GPS metadata.")

    # 3. Upload to Supabase Storage via S3
    storage_path = f"uploads/{datetime.now().timestamp()}_{file.filename}"
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=storage_path,
            Body=file_bytes,
            ContentType=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 Upload Failed: {str(e)}")

    # 4. Save Metadata to PostgreSQL (PostGIS)
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Use ST_SetSRID and ST_MakePoint for the Geography column
        insert_query = """
        INSERT INTO restaurantza_photos (storage_path, location, captured_at)
        VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)
        RETURNING id;
        """
        cur.execute(insert_query, (storage_path, lon, lat, captured_at))
        photo_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Insert Failed: {str(e)}")

    return {
        "message": "Upload successful",
        "photo_id": photo_id,
        "path": storage_path,
        "location": {"lat": lat, "lon": lon}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)