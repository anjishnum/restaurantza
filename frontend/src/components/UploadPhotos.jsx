import { useRef } from 'react';

export default function UploadPhotos({ onFilesSelected }) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    console.log('Selected files in component:', files);
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <button
        onClick={handleUploadClick}
        className="bg-white px-4 py-2 rounded-lg shadow-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
      >
        Upload photos
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png"
        multiple
        className="hidden"
      />
    </div>
  );
}
