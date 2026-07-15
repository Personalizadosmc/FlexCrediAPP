import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BleClient, ScanMode } from '@capacitor-community/bluetooth-le';

export interface DispositivoBLE {
  id: string;
  nombre: string;
  rssi?: number;
  conectado: boolean;
}

@Injectable({ providedIn: 'root' })
export class BluetoothService {
  private inicializado = false;
  private webDevices = new Map<string, any>();

  isSupported(): boolean {
    return Capacitor.isNativePlatform() || 'bluetooth' in navigator;
  }

  plataforma(): 'native' | 'web' | 'unsupported' {
    if (Capacitor.isNativePlatform()) return 'native';
    if ('bluetooth' in navigator) return 'web';
    return 'unsupported';
  }

  mensajeDisponibilidad(): string {
    if (Capacitor.isNativePlatform()) {
      return 'BLE disponible en app instalada. El dispositivo debe anunciar servicios BLE compatibles.';
    }
    if ('bluetooth' in navigator) {
      return 'Web Bluetooth disponible. En navegador solo conecta dispositivos BLE seleccionados por el usuario.';
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      return 'iPhone/iPad no permite Web Bluetooth desde Safari ni Chrome. Para BLE real necesitas la app instalada.';
    }
    return 'Este navegador no permite Bluetooth BLE desde la web. Prueba Chrome o Edge de escritorio, o la app instalada.';
  }

  async escanear(): Promise<DispositivoBLE[]> {
    if (Capacitor.isNativePlatform()) {
      return this.escanearNativo();
    }

    if (!('bluetooth' in navigator)) {
      console.warn('[BluetoothService] Bluetooth no disponible en este navegador.');
      return [];
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service'],
      });
      this.webDevices.set(device.id, device);
      return [{
        id: device.id,
        nombre: device.name || 'Dispositivo Bluetooth',
        conectado: false,
      }];
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        console.info('[BluetoothService] No hay adaptador Bluetooth web disponible o se cancelo la seleccion.');
      } else {
        console.info('[BluetoothService] Bluetooth web no disponible en este momento.');
      }
      return [];
    }
  }

  async conectar(id: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return this.conectarWeb(id);
    }

    try {
      await this.ensureInit();
      await BleClient.connect(id, undefined, { timeout: 12000 });
      return true;
    } catch (err) {
      console.error('[BluetoothService] Error conectando dispositivo BLE', err);
      return false;
    }
  }

  private async conectarWeb(id: string): Promise<boolean> {
    const device = this.webDevices.get(id);
    if (!device?.gatt) {
      console.warn('[BluetoothService] Dispositivo web no disponible para conexion GATT.');
      return false;
    }

    try {
      await device.gatt.connect();
      return true;
    } catch (err) {
      console.error('[BluetoothService] Error conectando BLE web', err);
      return false;
    }
  }

  nivelSenal(rssi?: number): string {
    if (!rssi) return 'N/A';
    if (rssi >= -55) return 'Excelente';
    if (rssi >= -65) return 'Buena';
    if (rssi >= -75) return 'Regular';
    return 'Debil';
  }

  private async ensureInit(): Promise<void> {
    if (this.inicializado) return;
    await BleClient.initialize();
    this.inicializado = true;
  }

  private async escanearNativo(): Promise<DispositivoBLE[]> {
    const encontrados: DispositivoBLE[] = [];

    try {
      await this.ensureInit();
      const enabled = await BleClient.isEnabled();
      if (!enabled) {
        await BleClient.requestEnable().catch(() => undefined);
      }

      await BleClient.requestLEScan(
        { allowDuplicates: false, scanMode: ScanMode.SCAN_MODE_LOW_LATENCY },
        (result) => {
          const id = result.device.deviceId;
          if (encontrados.some(d => d.id === id)) return;
          encontrados.push({
            id,
            nombre: result.localName || result.device.name || `Dispositivo cercano${result.rssi ? ' (' + result.rssi + ' dBm)' : ''}`,
            rssi: result.rssi,
            conectado: false,
          });
        }
      );

      await new Promise(resolve => setTimeout(resolve, 6000));
      await BleClient.stopLEScan().catch(() => undefined);
      return encontrados;
    } catch (err) {
      console.error('[BluetoothService] Error escaneando BLE real', err);
      await BleClient.stopLEScan().catch(() => undefined);
      return encontrados;
    }
  }
}
