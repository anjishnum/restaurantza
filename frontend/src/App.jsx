import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQueryClient } from '@tanstack/react-query';
import UploadPhotos from './components/UploadPhotos';
import { useUploadPhoto } from './hooks/useUploadPhoto';
import { usePhotos } from './hooks/usePhotos';

export default function App() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // To track and remove markers
  const queryClient = useQueryClient();

  const { data: photos = [] } = usePhotos();
  const { mutate: uploadPhoto } = useUploadPhoto();

  // Initialize Map
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

  // Sync Markers with Photos
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers
    photos.forEach(photo => {
      const { lon, lat } = photo.location;

      // Create a marker
      const marker = new maplibregl.Marker({ color: '#ff0000' })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      // Create a popup but don't attach it to the marker yet
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '200px',
        offset: [0, -32]
      }).setHTML(`
        <div class="p-1">
          <img src="${photo.url}" class="rounded h-32 w-full object-cover" />
          <p class="text-xs pt-1">${photo.captured_at ? new Date(photo.captured_at).toLocaleString() : 'No timestamp'}</p>
        </div>
      `);

      // Hover logic
      const el = marker.getElement();
      el.addEventListener('mouseenter', () => {
        popup.setLngLat([lon, lat]).addTo(mapRef.current);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });

      markersRef.current.push(marker);
    });
  }, [photos]);

  const handleFilesSelected = (files) => {
    console.log('App received files:', files);
    files.forEach((file) => {
      uploadPhoto(file, {
        onSuccess: (data) => {
          console.log('Successfully uploaded:', data);
          // Invalidate the photos query to refetch new markers
          queryClient.invalidateQueries({ queryKey: ['photos'] });
        },
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
