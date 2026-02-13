import { useState, useRef, memo, useCallback } from 'react';
import { validateImage, processImage, createImagePreview } from '../utils/imageUtils';
import './ImageUpload.css';

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  currentImageUrl?: string;
  label?: string;
  onError?: (error: string) => void;
  compress?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

function ImageUploadInner({ 
  onFileSelect, 
  currentImageUrl, 
  label = 'Bild',
  onError,
  compress = true,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);

    try {
      // Validiere Bild
      const validation = validateImage(file);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Ungültiges Bild';
        if (onError) {
          onError(errorMsg);
        } else {
          alert(errorMsg);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setProcessing(false);
        return;
      }

      // Verarbeite Bild (Komprimierung)
      let processedFile = file;
      if (compress) {
        const result = await processImage(file, { maxWidth, maxHeight, quality });
        if (!result.valid || !result.compressedFile) {
          const errorMsg = result.error || 'Fehler bei der Bildverarbeitung';
          if (onError) {
            onError(errorMsg);
          } else {
            alert(errorMsg);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setProcessing(false);
          return;
        }
        processedFile = result.compressedFile;
      }

      // Erstelle Vorschau
      const previewUrl = await createImagePreview(processedFile);
      setPreview(previewUrl);
      onFileSelect(processedFile);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Fehler beim Verarbeiten des Bildes';
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setProcessing(false);
    }
  }, [onError, compress, maxWidth, maxHeight, quality, onFileSelect]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  return (
    <div className="image-upload">
      <label>{label}</label>
      <div className="image-upload-container">
        {processing ? (
          <div className="image-processing">
            <span>⏳</span>
            <p>Bild wird verarbeitet...</p>
          </div>
        ) : preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            <button type="button" onClick={handleRemove} className="remove-image" disabled={processing}>
              ×
            </button>
          </div>
        ) : (
          <div className="image-upload-placeholder">
            <span>📷</span>
            <p>Klicken Sie hier, um ein Bild auszuwählen</p>
            <small style={{ fontSize: '12px', color: '#65676B', marginTop: '8px' }}>
              Max. 5MB • JPEG, PNG, WebP, GIF
            </small>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="image-input"
          disabled={processing}
        />
      </div>
    </div>
  );
}

export const ImageUpload = memo(ImageUploadInner);

