import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import './PhotoUpload.css';

interface PhotoUploadProps {
  orderId: string;
  onUploadSuccess?: (photoUrl: string) => void;
  onUploadError?: (error: string) => void;
  onClose?: () => void;
  type?: 'delivery' | 'pickup' | 'damage';
}

export function PhotoUpload({ 
  orderId, 
  onUploadSuccess, 
  onUploadError, 
  onClose,
  type = 'delivery'
}: PhotoUploadProps) {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1600;
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error(t('photo.canvasError')));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              return reject(new Error(t('photo.compressionError')));
            }
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          'image/jpeg',
          0.82
        );
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };

      img.src = url;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
      setError(t('photo.invalidType'));
      return;
    }

    // Validiere Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('photo.tooLarge'));
      return;
    }

    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (compressionError: unknown) {
      const errorMessage = compressionError instanceof Error 
        ? compressionError.message 
        : String(compressionError) || t('photo.compressionError');
      setError(errorMessage);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!photo) {
      setError(t('photo.noPhoto'));
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('orderId', orderId);
      formData.append('type', type);

      const response = await api.post(`/orders/${orderId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onUploadSuccess) {
        onUploadSuccess(response.data.photoUrl || response.data.url);
      }

      // Reset
      setPhoto(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      if (onClose) {
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: unknown) {
      let errorMessage = t('photo.uploadError');
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const getTypeLabel = () => {
    const labels = {
      delivery: t('photo.type.delivery'),
      pickup: t('photo.type.pickup'),
      damage: t('photo.type.damage'),
    };
    return labels[type] || t('photo.type.default');
  };

  return (
    <div className="photo-upload-container">
      <div className="photo-upload-header">
        <h3>📷 {getTypeLabel()}</h3>
        {onClose && (
          <button onClick={onClose} className="photo-upload-close">
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="photo-upload-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="photo-upload-content">
        {preview ? (
          <div className="photo-preview">
            <img src={preview} alt={t('photo.preview')} />
            <button
              onClick={() => {
                setPhoto(null);
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (cameraInputRef.current) cameraInputRef.current.value = '';
              }}
              className="photo-remove"
            >
              ✕ {t('photo.remove')}
            </button>
          </div>
        ) : (
          <div className="photo-upload-placeholder">
            <div className="photo-upload-icon">📷</div>
            <p>{t('photo.noPhotoSelected')}</p>
          </div>
        )}

        <div className="photo-upload-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="photo-select-button"
            disabled={uploading}
          >
            📁 {t('photo.selectFromGallery')}
          </button>
          
          <button
            onClick={handleCameraCapture}
            className="photo-camera-button"
            disabled={uploading}
          >
            📷 {t('photo.takePhoto')}
          </button>
        </div>

        {photo && (
          <button
            onClick={handleUpload}
            className="photo-upload-button"
            disabled={uploading || !photo}
          >
            {uploading ? t('photo.uploading') : t('photo.upload')}
          </button>
        )}
      </div>
    </div>
  );
}

