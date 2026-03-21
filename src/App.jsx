import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function App() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [77.5775, 12.9629],
      zoom: 10
    });

    return () => map.remove();
  }, []);

  return (
    <div ref={mapContainer} className="h-screen w-full" />
  );
}
