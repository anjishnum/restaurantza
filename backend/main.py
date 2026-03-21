import os
import io
import traceback
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, quote

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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configuration ---
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
BUCKET_NAME = "restaurantza-images"

# Get raw database URL and handle special characters in password
raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url and "@" in raw_db_url:
    try:
        # Split on the last @ to separate credentials from host
        prefix, rest = raw_db_url.rsplit("@", 1)
        # Split prefix to get 'postgresql://user:pass'
        protocol_user, password = prefix.rsplit(":", 1)
        # Encode password and rebuild URL
        DATABASE_URL = f"{protocol_user}:{quote(password)}@{rest}"
    except Exception:
        DATABASE_URL = raw_db_url
else:
    DATABASE_URL = raw_db_url

# Initialize S3 Client (use us-east-1 as it's standard for S3-compatible providers)
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    region_name="us-east-1"
)

def convert_to_decimal(coords, ref):
    """Helper to convert EXIF DMS to Decimal Degrees"""
    if not coords or not ref:
        return None
    decimal = float(coords[0]) + float(coords[1]) / 60 + float(coords[2]) / 3600
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal

@app.post("/upload")
async def upload_restaurant_photo(file: UploadFile = File(...)):
    print(f"Received upload request: {file.filename} ({file.content_type})")
    
    # 1. Read file into memory
    file_bytes = await file.read()
    
    # 2. Extract Metadata (EXIF)
    lat, lon, captured_at = None, None, None
    try:
        img = Image(io.BytesIO(file_bytes))
        if img.has_exif:
            lat = convert_to_decimal(getattr(img, "gps_latitude", None), getattr(img, "gps_latitude_ref", None))
            lon = convert_to_decimal(getattr(img, "gps_longitude", None), getattr(img, "gps_longitude_ref", None))
            
            exif_time = getattr(img, "datetime_original", None)
            if exif_time:
                captured_at = datetime.strptime(exif_time, '%Y:%m:%d %H:%M:%S')
            print(f"Metadata found - Lat: {lat}, Lon: {lon}, Time: {captured_at}")
    except Exception as e:
        print(f"EXIF Extraction Error (non-fatal): {e}")

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Photo is missing GPS metadata.")

    # 3. Upload to Supabase Storage via S3
    storage_path = f"uploads/{datetime.now().timestamp()}_{file.filename}"
    try:
        print(f"Uploading to S3: {BUCKET_NAME}/{storage_path}...")
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=storage_path,
            Body=file_bytes,
            ContentType=file.content_type
        )
    except Exception as e:
        print(f"S3 Upload Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"S3 Upload Failed: {str(e)}")

    # 4. Save Metadata to PostgreSQL (PostGIS)
    try:
        print(f"Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        insert_query = """
        INSERT INTO restaurantza_photos (storage_path, location, captured_at)
        VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
        RETURNING id;
        """
        cur.execute(insert_query, (storage_path, lon, lat, captured_at))
        photo_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"Database insert successful. ID: {photo_id}")
    except Exception as e:
        print(f"Database Insert Error: {e}")
        traceback.print_exc()
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