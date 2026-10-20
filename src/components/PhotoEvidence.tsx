import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { compressImage } from '../utils/imageCompressor';
import { Camera, X, Loader2 } from 'lucide-react';
import PhotoModal from './PhotoModal';

interface PhotoEvidenceUploaderProps {
  docId: string;
  photos: string[];
  onPhotosChange: (updatedUrls: string[]) => void;
}

const PhotoEvidenceUploader: React.FC<PhotoEvidenceUploaderProps> = ({
  docId,
  photos,
  onPhotosChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrorMessage(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImage(file, 1200, 0.75);
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `evidences/${docId}/${fileName}`);

        const snapshot = await uploadBytes(storageRef, compressedBlob, {
          contentType: 'image/jpeg',
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(downloadUrl);
      }

      onPhotosChange([...photos, ...uploadedUrls]);
    } catch (err: any) {
      console.error('Error al subir fotos:', err);
      setErrorMessage('Failed to upload one or more images. Check connection.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    onPhotosChange(photos.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          Job Site Evidence (Photos)
        </label>
        <span className="text-[11px] text-slate-400 font-bold">
          {photos.length} uploaded
        </span>
      </div>

      {/* Galería de miniaturas (Clic para abrir PhotoModal) */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {photos.map((url, idx) => (
            <div
              key={idx}
              onClick={() => setIsModalOpen(true)}
              className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-2xs cursor-pointer"
            >
              <img
                src={url}
                alt={`Evidence ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto(url);
                }}
                className="absolute top-1.5 right-1.5 bg-slate-900/75 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subida (Permite Cámara o Galería en móvil) */}
      <div>
        <label
          className={`flex items-center justify-center gap-2 p-3.5 border-2 border-dashed rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            uploading
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              : 'border-[#8B4513]/30 bg-[#FCEEE6]/50 hover:bg-[#FCEEE6] text-[#8B4513] hover:border-[#8B4513]/60'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 text-[#8B4513] animate-spin" />
              <span>Compressing & Uploading...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-[#8B4513]" />
              <span>Take Photo or Upload from Gallery</span>
            </>
          )}
        </label>
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 font-semibold mt-1">{errorMessage}</p>
      )}

      <PhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        photos={photos}
        title="Job Site Evidence"
      />
    </div>
  );
};

export default PhotoEvidenceUploader;