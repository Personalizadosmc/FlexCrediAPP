import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/** Acceso a cámara y galería con respaldo para navegador. */
@Injectable({ providedIn: 'root' })
export class CameraService {

  /**
   * Toma una foto con la cámara (o galería en web) y la retorna
   * como data URL (base64). Retorna null si el usuario cancela.
   */
  async tomarFoto(source: CameraSource = CameraSource.Prompt): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      return source === CameraSource.Camera ? this.tomarFotoWebCamara() : this.fallbackWeb(false);
    }

    try {
      const photo: Photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1024,
      } as any);
      return photo.dataUrl || null;
    } catch (err) {
      console.warn('[CameraService] Capacitor falló, usando fallback web', err);
      return this.fallbackWeb(source === CameraSource.Camera);
    }
  }

  tomarDesdeCamara(): Promise<string | null> {
    return this.tomarFoto(CameraSource.Camera);
  }

  elegirDesdeGaleria(): Promise<string | null> {
    return this.tomarFoto(CameraSource.Photos);
  }

  private async tomarFotoWebCamara(): Promise<string | null> {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return this.fallbackWeb(true);
    }

    let stream: MediaStream | null = null;
    return new Promise(async (resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#07142f;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;';
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.cssText = 'width:100%;max-width:520px;max-height:70vh;border-radius:16px;background:#000;object-fit:cover;';
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;margin-top:14px;width:100%;max-width:520px;';
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancelar';
      cancel.style.cssText = 'flex:1;height:46px;border:0;border-radius:12px;background:#e5e7eb;color:#0d2252;font-weight:800;';
      const shot = document.createElement('button');
      shot.textContent = 'Tomar foto';
      shot.style.cssText = 'flex:1;height:46px;border:0;border-radius:12px;background:#f59e0b;color:#0d2252;font-weight:900;';
      actions.append(cancel, shot);
      overlay.append(video, actions);

      const limpiar = () => {
        stream?.getTracks().forEach(t => t.stop());
        overlay.remove();
      };

      cancel.onclick = () => { limpiar(); resolve(null); };
      shot.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1024;
        canvas.height = video.videoHeight || 768;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.86);
        limpiar();
        resolve(data);
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        video.srcObject = stream;
        document.body.appendChild(overlay);
        await video.play();
      } catch {
        limpiar();
        resolve(await this.fallbackWeb(true));
      }
    });
  }

  /** Fallback para navegador: input file */
  private fallbackWeb(usarCamara = false): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (usarCamara) input.capture = 'environment' as any;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      const limpiar = () => input.remove();
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { limpiar(); return resolve(null); }
        const reader = new FileReader();
        reader.onload = () => { limpiar(); resolve(reader.result as string); };
        reader.onerror = () => { limpiar(); resolve(null); };
        reader.readAsDataURL(file);
      };
      input.oncancel = () => { limpiar(); resolve(null); };
      input.click();
    });
  }
}
