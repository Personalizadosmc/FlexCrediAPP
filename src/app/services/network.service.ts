import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';

export interface NetworkState {
  connected: boolean;
  connectionType: string;
  lastChecked: Date;
}

@Injectable({ providedIn: 'root' })
export class NetworkService {

  // BehaviorSubject — cualquier componente puede suscribirse
  private _state = new BehaviorSubject<NetworkState>({
    connected: true,
    connectionType: 'unknown',
    lastChecked: new Date()
  });

  // Observable público (solo lectura)
  readonly state$ = this._state.asObservable();

  // Cola de datos pendientes de sincronizar
  private static readonly KEY_QUEUE = 'fc_sync_queue';

  private listener: PluginListenerHandle | null = null;

  constructor(private zone: NgZone) {
    this.init();
  }

  // ── Inicializar: obtener estado actual y escuchar cambios ──
  private async init() {
    try {
      const status = await Network.getStatus();
      this.updateState(status.connected, status.connectionType);
    } catch {
      // En web/browser Network.getStatus() puede fallar — usamos navigator
      this.updateState(navigator.onLine, 'wifi');
    }

    try {
      this.listener = await Network.addListener('networkStatusChange', (status) => {
        // Forzar detección en zona Angular para que el template se actualice
        this.zone.run(() => {
          this.updateState(status.connected, status.connectionType);
          if (status.connected) {
            this.sincronizarColaPendiente();
          }
        });
      });
    } catch {
      // Fallback para browser: escuchar eventos online/offline nativos
      window.addEventListener('online',  () => this.zone.run(() => this.updateState(true,  'wifi')));
      window.addEventListener('offline', () => this.zone.run(() => this.updateState(false, 'none')));
    }
  }

  private updateState(connected: boolean, connectionType: string) {
    this._state.next({ connected, connectionType, lastChecked: new Date() });
  }

  // Acceso directo al estado actual (sin suscripción)
  get current(): NetworkState { return this._state.getValue(); }
  get isOnline(): boolean     { return this._state.getValue().connected; }

  // ── Cola offline ─────────────────────────────────────────
  encolarDato(dato: any): void {
    const cola = this.obtenerCola();
    cola.push({ ...dato, _timestamp: new Date().toISOString() });
    localStorage.setItem(NetworkService.KEY_QUEUE, JSON.stringify(cola));
  }

  obtenerCola(): any[] {
    const raw = localStorage.getItem(NetworkService.KEY_QUEUE);
    return raw ? JSON.parse(raw) : [];
  }

  limpiarCola(): void {
    localStorage.removeItem(NetworkService.KEY_QUEUE);
  }

  // Simulación de sincronización: en un proyecto real aquí irían
  // las llamadas HTTP al servidor
  async sincronizarColaPendiente(): Promise<void> {
    const cola = this.obtenerCola();
    if (cola.length === 0) return;
    console.log(`[NetworkService] Sincronizando ${cola.length} cambios pendientes...`);
    // Aquí irían las llamadas HTTP reales
    // Por ahora simplemente limpiamos la cola
    this.limpiarCola();
    console.log('[NetworkService] Cola sincronizada correctamente.');
  }

  // Etiquetar el tipo de conexión en español
  tipoConexionLabel(tipo: string): string {
    const map: Record<string, string> = {
      wifi:     'WiFi',
      cellular: 'Datos móviles',
      '4g':     '4G',
      '3g':     '3G',
      '2g':     '2G',
      none:     'Sin conexión',
      unknown:  'Desconocido',
    };
    return map[tipo?.toLowerCase()] || tipo || 'Desconocido';
  }

  // Limpiar listener al destruir (buenas prácticas)
  destroy() {
    this.listener?.remove();
  }
}
