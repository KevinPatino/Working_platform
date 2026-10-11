import React, { useState } from 'react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  title?: string;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photos,
  title = 'Site Evidence',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800 text-white">
          <div>
            <h3 className="font-bold text-base">{title}</h3>
            <p className="text-xs text-gray-400">
              Photo {currentIndex + 1} of {photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Visor principal de la imagen */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[60vh] overflow-hidden select-none">
          <img
            src={currentPhoto}
            alt={`Evidence ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-900/70 hover:bg-gray-900 text-white p-2.5 rounded-full transition-colors cursor-pointer"
                title="Previous photo"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-900/70 hover:bg-gray-900 text-white p-2.5 rounded-full transition-colors cursor-pointer"
                title="Next photo"
              >
                ▶
              </button>
            </>
          )}
        </div>

        {/* Pie con miniaturas y botón de ver en pestaña nueva */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between gap-4 bg-gray-900/90">
          <div className="flex gap-2 overflow-x-auto py-1">
            {photos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  idx === currentIndex
                    ? 'border-blue-500 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={url}
                  alt={`Thumb ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <a
            href={currentPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-lg shrink-0 transition-colors"
          >
            Open Full Size ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;