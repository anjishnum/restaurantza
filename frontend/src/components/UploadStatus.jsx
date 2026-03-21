import { useEffect, useState } from 'react';

/**
 * Toast component for individual notification messages.
 */
function Toast({ id, message, type, onClose, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-500/70' : 'bg-red-500/70';
  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div
      className={`
        max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-md text-white flex items-start gap-3
        transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${bgColor}
      `}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-base">
          {type === 'success' ? 'Success' : 'Upload Failed'}
        </p>
        <p className="text-sm text-white/90 mt-1 leading-relaxed">
          {message}
        </p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}
        className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * UploadStatus component to display a stack of toast notifications at the bottom right.
 */
export default function UploadStatus({ notifications = [], onClearNotification }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {notifications.map((notif) => (
          <Toast
            key={notif.id}
            id={notif.id}
            message={notif.message}
            type={notif.type}
            onClose={onClearNotification}
          />
        ))}
      </div>
    </div>
  );
}
