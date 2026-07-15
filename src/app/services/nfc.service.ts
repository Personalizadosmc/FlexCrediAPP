import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorNfc, NdefRecord, NfcEvent, PluginListenerHandle } from '@capgo/capacitor-nfc';

@Injectable({ providedIn: 'root' })
export class NfcService {
  get soportado(): boolean {
    return this.isSupported();
  }

  isSupported(): boolean {
    return Capacitor.isNativePlatform() || 'NDEFReader' in window;
  }

  async verificarSoporteNativo(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return this.isSupported();
    try {
      const { supported } = await CapacitorNfc.isSupported();
      return supported;
    } catch {
      return false;
    }
  }

  async estadoNativo(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return this.isSupported() ? 'NFC_OK' : 'NO_NFC';
    try {
      const { status } = await CapacitorNfc.getStatus();
      return status;
    } catch {
      return 'NO_NFC';
    }
  }

  mensajeDisponibilidad(): string {
    if (Capacitor.isNativePlatform()) {
      return 'NFC nativo disponible en la app instalada. Acerca un tag NFC NDEF para leer o escribir.';
    }
    if (this.isSupported()) {
      return 'Web NFC disponible. Acerca un tag NFC NDEF para leer o escribir.';
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      return 'iPhone/iPad no permite NFC desde Safari ni Chrome. Usa la app instalada para NFC nativo.';
    }
    return 'Este navegador no permite Web NFC. Para NFC real usa la app instalada en Android/iOS.';
  }

  async escribir(texto: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return this.escribirNativo(texto);
    }

    if (!this.isSupported()) {
      console.warn('[NfcService] NFC real no disponible en este dispositivo/navegador.');
      return false;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.write({
        records: [{ recordType: 'text', data: texto }]
      });
      return true;
    } catch (err) {
      console.error('[NfcService] Error escribiendo tag NFC web', err);
      return false;
    }
  }

  compartir(texto: string): Promise<boolean> {
    return this.escribir(texto);
  }

  async compartirTexto(texto: string): Promise<{ ok: boolean; msg: string }> {
    const ok = await this.escribir(texto);
    return {
      ok,
      msg: ok ? 'Datos escritos en el tag NFC' : this.mensajeDisponibilidad()
    };
  }

  async leer(timeoutMs = 15000): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      return this.leerNativo(timeoutMs);
    }

    if (!this.isSupported()) {
      console.warn('[NfcService] NFC real no disponible en este dispositivo/navegador.');
      return null;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      return await new Promise<string | null>((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        ndef.addEventListener('reading', (event: any) => {
          clearTimeout(timer);
          const decoder = new TextDecoder();
          for (const record of event.message.records) {
            if (record.recordType === 'text' || record.recordType === 'url') {
              return resolve(decoder.decode(record.data));
            }
          }
          resolve(null);
        }, { once: true });
      });
    } catch (err) {
      console.error('[NfcService] Error leyendo tag NFC web', err);
      return null;
    }
  }

  async abrirAjustesNfc(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await CapacitorNfc.showSettings().catch(() => undefined);
  }

  private async escribirNativo(texto: string): Promise<boolean> {
    const soportado = await this.verificarSoporteNativo();
    if (!soportado) return false;

    const record = this.crearRegistroTexto(texto);
    let listener: PluginListenerHandle | null = null;
    let terminado = false;

    const limpiar = async () => {
      if (listener) {
        await listener.remove().catch(() => undefined);
        listener = null;
      }
      await CapacitorNfc.stopScanning().catch(() => undefined);
    };

    return new Promise<boolean>(async (resolve) => {
      const cerrar = async (ok: boolean) => {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer);
        await limpiar();
        resolve(ok);
      };

      const timer = setTimeout(() => cerrar(false), 20000);

      try {
        listener = await CapacitorNfc.addListener('nfcEvent', async (event: NfcEvent) => {
          if (event.tag?.isWritable === false) {
            await cerrar(false);
            return;
          }

          try {
            await CapacitorNfc.write({ allowFormat: true, records: [record] });
            await cerrar(true);
          } catch (err) {
            console.error('[NfcService] Error escribiendo tag NFC nativo', err);
            await cerrar(false);
          }
        });

        await CapacitorNfc.startScanning({
          invalidateAfterFirstRead: false,
          alertMessage: 'Acerca un tag NFC para escribir datos de FlexCredi.',
          iosSessionType: 'ndef',
          iosPollingOptions: ['iso14443', 'iso15693']
        });
      } catch (err) {
        console.error('[NfcService] Error iniciando NFC nativo', err);
        await cerrar(false);
      }
    });
  }

  private async leerNativo(timeoutMs: number): Promise<string | null> {
    const soportado = await this.verificarSoporteNativo();
    if (!soportado) return null;

    let listener: PluginListenerHandle | null = null;
    let terminado = false;

    const limpiar = async () => {
      if (listener) {
        await listener.remove().catch(() => undefined);
        listener = null;
      }
      await CapacitorNfc.stopScanning().catch(() => undefined);
    };

    return new Promise<string | null>(async (resolve) => {
      const cerrar = async (valor: string | null) => {
        if (terminado) return;
        terminado = true;
        clearTimeout(timer);
        await limpiar();
        resolve(valor);
      };

      const timer = setTimeout(() => cerrar(null), timeoutMs);

      try {
        listener = await CapacitorNfc.addListener('nfcEvent', async (event: NfcEvent) => {
          const contenido = this.extraerTexto(event);
          await cerrar(contenido);
        });

        await CapacitorNfc.startScanning({
          invalidateAfterFirstRead: true,
          alertMessage: 'Acerca un tag NFC para leer datos de FlexCredi.',
          iosSessionType: 'ndef',
          iosPollingOptions: ['iso14443', 'iso15693']
        });
      } catch (err) {
        console.error('[NfcService] Error leyendo NFC nativo', err);
        await cerrar(null);
      }
    });
  }

  private crearRegistroTexto(texto: string): NdefRecord {
    const encoder = new TextEncoder();
    const lang = Array.from(encoder.encode('es'));
    const data = Array.from(encoder.encode(texto));
    return {
      tnf: 0x01,
      type: [0x54],
      id: [],
      payload: [lang.length & 0x3f, ...lang, ...data]
    };
  }

  private extraerTexto(event: NfcEvent): string | null {
    const records = event.tag?.ndefMessage || [];
    for (const record of records) {
      const text = this.decodificarRegistroTexto(record);
      if (text) return text;
    }
    if (event.tag?.id?.length) {
      return 'TAG_ID:' + event.tag.id.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
    return null;
  }

  private decodificarRegistroTexto(record: NdefRecord): string | null {
    if (!record.payload?.length) return null;
    const type = String.fromCharCode(...record.type);
    const decoder = new TextDecoder();

    if (record.tnf === 0x01 && type === 'T') {
      const langLength = record.payload[0] & 0x3f;
      return decoder.decode(new Uint8Array(record.payload.slice(1 + langLength)));
    }

    if (record.tnf === 0x01 && type === 'U') {
      return decoder.decode(new Uint8Array(record.payload.slice(1)));
    }

    return decoder.decode(new Uint8Array(record.payload));
  }
}
