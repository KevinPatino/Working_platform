import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  titles?: string[]; // <-- NUEVO: Arreglo opcional con el título/etiqueta de cada foto
  title?: string;    // Título general por defecto
  initialIndex?: number;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  photos,
  titles,
  title = 'Site Evidence',
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Cada vez que se abra el modal, asegurarnos de sincronizar el índice inicial
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  // Determina el título actual: si hay arreglo de titles, usa el de la foto actual; si no, usa el título general
  const currentTitle = titles && titles[currentIndex] ? titles[currentIndex] : title;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal (Estilo limpio UI) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
          <div className="min-w-0 pr-4">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
              {currentTitle}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Photo {currentIndex + 1} of {photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visor principal de la imagen */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-[320px] max-h-[60vh] overflow-hidden select-none">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-md transition-colors cursor-pointer"
                title="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-md transition-colors cursor-pointer"
                title="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Pie con miniaturas y botón de abrir tamaño real */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-4 bg-[#F4F6F9]">
          <div className="flex gap-2 overflow-x-auto py-1 max-w-[70%] sm:max-w-[80%]">
            {photos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer shadow-2xs ${
                  idx === currentIndex
                    ? 'border-[#8B4513] scale-105 ring-2 ring-[#8B4513]/20'
                    : 'border-slate-200 opacity-60 hover:opacity-100'
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
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#8B4513] text-xs font-extrabold rounded-xl border border-slate-200/80 shrink-0 transition-colors shadow-2xs inline-flex items-center gap-1.5"
          >
            <span>Full Size</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;