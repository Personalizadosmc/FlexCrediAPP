import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/** Escáner QR nativo con compatibilidad para navegadores modernos. */
@Injectable({ providedIn: 'root' })
export class QrService {

  private stream: MediaStream | null = null;
  ultimoError = '';

  /** Verifica si BarcodeDetector está disponible en el navegador */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    return 'BarcodeDetector' in window;
  }

  /**
   * Inicia el escaneo de QR usando la cámara del dispositivo
   * @param videoElement - elemento <video> donde mostrar la cámara
   * @returns el texto del QR escaneado o null si se cancela
   */
  async escanear(videoElement: HTMLVideoElement): Promise<string | null> {
    try {
      this.ultimoError = '';
      if (Capacitor.isNativePlatform()) {
        return await this.escanearNativo();
      }
      if (!window.isSecureContext) {
        this.ultimoError = 'iPhone bloquea la c\u00e1mara en HTTP. Usa ionic serve --external --ssl o instala la app con Capacitor.';
        return null;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        this.ultimoError = 'Este navegador no permite abrir la c\u00e1mara desde esta p\u00e1gina.';
        return null;
      }
      // Solicitar cámara trasera
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoElement.srcObject = this.stream;
      await videoElement.play();

      if (!this.isSupported()) {
        console.warn('[QrService] BarcodeDetector no soportado, usando simulación');
        // Simulación: esperar 3 segundos y retornar un QR de prueba
        return new Promise((resolve) => {
          setTimeout(() => {
            this.detener();
            resolve('CLI-DEMO-12345');
          }, 3000);
        });
      }

      // @ts-ignore  — BarcodeDetector es experimental
      const detector = new BarcodeDetector({ formats: ['qr_code'] });

      return new Promise((resolve) => {
        const scan = async () => {
          if (!this.stream) return resolve(null);
          try {
            const barcodes = await detector.detect(videoElement);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              this.detener();
              return resolve(code);
            }
          } catch (e) {
            console.warn('[QrService] Error detectando', e);
          }
          requestAnimationFrame(scan);
        };
        scan();
      });
    } catch (err) {
      console.error('[QrService] Error al iniciar cámara', err);
      this.ultimoError = 'No se pudo abrir la c\u00e1mara. Revisa los permisos del navegador.';
      return null;
    }
  }

  /** Detiene el escaneo y libera la cámara */
  private async escanearNativo(): Promise<string | null> {
    const permiso = await BarcodeScanner.requestPermissions();
    if (permiso.camera !== 'granted' && permiso.camera !== 'limited') {
      console.warn('[QrService] Permiso de camara denegado');
      return null;
    }

    const result = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode],
      autoZoom: true,
    });
    const barcode = result.barcodes?.[0];
    return barcode?.rawValue || barcode?.displayValue || null;
  }

  detener(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  /**
   * Genera un QR como data URL usando la API pública de QR Server
   * (útil para mostrar el QR del cliente / préstamo)
   */
  generarQrUrl(texto: string, size = 200): string {
    const encoded = encodeURIComponent(texto);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }
}
