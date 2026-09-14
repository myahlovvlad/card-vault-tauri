import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScanLine, X } from 'lucide-react';
import { decodeQrFromVideoFrame, type DecodedQr } from '../lib/qrcode';

interface Props {
  open: boolean;
  onClose: () => void;
  onDecoded: (text: string) => void;
}

export function QrScanner({ open, onClose, onDecoded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        setError('Не удалось получить доступ к камере. Проверьте разрешения устройства или введите данные вручную.');
        setManualOpen(true);
      }
    }

    function tick() {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const result: DecodedQr | null = decodeQrFromVideoFrame(videoRef.current, canvasRef.current);
      if (result) {
        onDecoded(result.text);
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, onDecoded]);

  useEffect(() => {
    if (!open) { setError(''); setManualOpen(false); setManualText(''); }
  }, [open]);

  if (!open) return null;

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Сканировать QR-код визитки">
      <button className="icon-button overlay-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>

      {!error && (
        <>
          <video ref={videoRef} className="scanner-video" muted playsInline />
          <div className="scanner-frame"><span className="scanner-scanline" /></div>
          <p className="scanner-caption"><ScanLine size={15} />Наведите камеру на QR-код визитки</p>
        </>
      )}
      <canvas ref={canvasRef} hidden />

      {error && <p className="scanner-error">{error}</p>}

      <div className="scanner-fallback">
        {!manualOpen ? (
          <button className="secondary-button" onClick={() => setManualOpen(true)}><Keyboard size={16} />Ввести данные вручную</button>
        ) : (
          <form className="scanner-manual" onSubmit={(event) => { event.preventDefault(); if (manualText.trim()) onDecoded(manualText.trim()); }}>
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4} placeholder="Вставьте текст vCard (BEGIN:VCARD…) или контактные данные" />
            <button type="submit" className="primary-button">Распознать</button>
          </form>
        )}
      </div>
    </div>
  );
}
