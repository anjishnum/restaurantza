import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import UploadPhotos from './components/UploadPhotos';
import { useUploadPhoto } from './hooks/useUploadPhoto';

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null); // Ref to store the map instance
  const { mutate: uploadPhoto } = useUploadPhoto();

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    try {
      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: [77.5775, 12.9629],
        zoom: 10,
        projection: 'mercator'
      });

      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });

      resizeObserver.observe(mapContainer.current);

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        resizeObserver.disconnect();
      };
    } catch (err) {
      console.error('Map initialization failed:', err);
    }
  }, []);

  const handleFilesSelected = (files) => {
    console.log('App received files:', files);
    files.forEach((file) => {
      uploadPhoto(file, {
        onSuccess: (data) => console.log('Successfully uploaded:', data),
        onError: (err) => console.error('Upload failed:', err),
      });
    });
  };

  return (
    <div className="w-screen h-screen relative bg-gray-100 overflow-hidden">
      <div
        id="map-container"
        ref={mapContainer}
        className="w-full h-full absolute inset-0"
      />
      <UploadPhotos onFilesSelected={handleFilesSelected} />
    </div>
  );
}
