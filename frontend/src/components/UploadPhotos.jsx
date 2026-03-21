import { useRef, useState } from 'react';

export default function UploadPhotos({ onFilesSelected }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    if (onFilesSelected) {
      onFilesSelected(files);
    }
    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center
          p-4 rounded-xl border-2 border-dashed transition-all duration-200
          ${isDragging
            ? 'bg-blue-50 border-blue-400 scale-105 shadow-xl'
            : 'bg-white border-gray-200 shadow-lg hover:border-gray-300'
          }
        `}
      >
        <div className="text-center mb-2">
          <p className="text-base font-semibold text-gray-700">Add Photos</p>
          <p className="text-sm text-gray-500">Click or drag & drop</p>
        </div>

        <button
          onClick={handleUploadClick}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer
            ${isDragging
              ? 'bg-blue-500 text-white'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }
          `}
        >
          Select Files
        </button>
      </div>

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

