import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { compressImage } from '../utils/imageCompressor';

interface PhotoEvidenceUploaderProps {
  docId: string; // Identificador del turno diario (ej: uid_2026-10-10)
  photos: string[]; // Lista actual de URLs de fotos
  onPhotosChange: (updatedUrls: string[]) => void;
}

const PhotoEvidenceUploader: React.FC<PhotoEvidenceUploaderProps> = ({
  docId,
  photos,
  onPhotosChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Compresión en el cliente
        const compressedBlob = await compressImage(file, 1200, 0.75);

        // 2. Definir ruta en Firebase Storage: evidences/{docId}/{timestamp}_{nombre}
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `evidences/${docId}/${fileName}`);

        // 3. Subir el Blob comprimido
        const snapshot = await uploadBytes(storageRef, compressedBlob, {
          contentType: 'image/jpeg',
        });

        // 4. Obtener URL de descarga
        const downloadUrl = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(downloadUrl);
      }

      onPhotosChange([...photos, ...uploadedUrls]);
    } catch (err: any) {
      console.error('Error al subir fotos:', err);
      setErrorMessage('Failed to upload one or more images. Check connection.');
    } finally {
      setUploading(false);
      // Limpiar input para permitir subir la misma foto si se desea
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    onPhotosChange(photos.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
          Job Site Evidence (Photos)
        </label>
        <span className="text-[11px] text-gray-400 font-medium">
          {photos.length} uploaded
        </span>
      </div>

      {/* Galería de miniaturas */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-xs"
            >
              <img
                src={url}
                alt={`Evidence ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(url)}
                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subida y cámara */}
      <div>
        <label
          className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            uploading
              ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 hover:border-blue-400'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            disabled={uploading}
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Compressing & Uploading...</span>
            </>
          ) : (
            <>
              <span className="text-base">📷</span>
              <span>Take Photo or Upload Evidence</span>
            </>
          )}
        </label>
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 font-semibold mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default PhotoEvidenceUploader;