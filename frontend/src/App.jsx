import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import UploadPhotos from './components/UploadPhotos';

export default function App() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [77.5775, 12.9629],
      zoom: 10
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      map.remove();
      resizeObserver.disconnect();
    };
  }, []);

  const handleFilesSelected = (files) => {
    console.log('App received files:', files);
    // Future upload logic goes here
  };

  return (
    <div className="w-screen h-screen relative bg-gray-100 overflow-hidden">
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      {/* Upload UI Overlay Component */}
      <UploadPhotos onFilesSelected={handleFilesSelected} />
    </div>
  );
}
