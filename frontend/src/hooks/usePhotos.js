import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const usePhotos = () => {
  return useQuery({
    queryKey: ['photos'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      return response.json();
    },
  });
};
