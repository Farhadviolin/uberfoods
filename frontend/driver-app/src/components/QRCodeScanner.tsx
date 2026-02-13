import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import './QRCodeScanner.css';

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
  onClose: () => void;
  orderId?: string;
}

export function QRCodeScanner({ onScanSuccess, onScanFailure, onClose, orderId }: QRCodeScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR-Code erfolgreich gescannt
          onScanSuccess(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignoriere häufige Scan-Fehler (wenn kein QR-Code im Bild)
          if (!errorMessage.includes('No QR code found')) {
            console.debug('QR Scan:', errorMessage);
          }
        }
      );

      setCameraPermission(true);
    } catch (err: unknown) {
      console.error('Fehler beim Starten des QR-Scanners:', err);
      const errorMessage = err instanceof Error ? err.message : t('qr.cameraError');
      setError(errorMessage);
      setCameraPermission(false);
      setScanning(false);
      
      if (onScanFailure) {
        onScanFailure(errorMessage);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Fehler beim Stoppen des Scanners:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h3>{t('qr.title')}</h3>
          {orderId && <p>{t('order.title', { id: orderId.slice(-8) })}</p>}
          <button onClick={handleClose} className="qr-scanner-close" aria-label={t('qr.close')}>
            ✕
          </button>
        </div>

        {error && (
          <div className="qr-scanner-error">
            <p>⚠️ {error}</p>
            {error.includes('Permission') && (
              <p className="qr-scanner-help">
                {t('qr.permissionHelp')}
              </p>
            )}
            <button onClick={startScanning} className="qr-scanner-retry">
              {t('qr.retry')}
            </button>
          </div>
        )}

        <div id="qr-reader" className="qr-reader"></div>

        {scanning && !error && (
          <div className="qr-scanner-instructions">
            <p>📷 {t('qr.instructions')}</p>
          </div>
        )}

        <div className="qr-scanner-actions">
          <button onClick={handleClose} className="qr-scanner-cancel">
            {t('qr.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

