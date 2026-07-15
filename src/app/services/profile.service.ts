import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { AppConfig, Compartido } from '../models';

/** Gestiona el perfil, las preferencias y el historial local. */
@Injectable({ providedIn: 'root' })
export class ProfileService {

  private _storage: Storage | null = null;
  private ready: Promise<void>;

  private KEY_CONFIG      = 'fc_app_config';
  private KEY_COMPARTIDOS = 'fc_compartidos';
  private KEY_FOTO        = 'fc_foto_perfil';
  private KEY_LOGO        = 'fc_logo_empresa';

  private defaultConfig: AppConfig = {
    temaOscuro:      false,
    notificaciones:  true,
    sonidos:         true,
    autoSincronizar: true,
    vibracion:       true,
  };

  constructor(private storage: Storage) {
    this.ready = this.init();
  }

  async init(): Promise<void> {
    try {
      this._storage = await this.storage.create();
    } catch {
      console.info('[ProfileService] Ionic Storage no disponible; usando localStorage.');
      this._storage = null;
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
    if (!this._storage) {
      try {
        this._storage = await this.storage.create();
      } catch {
        this._storage = null;
      }
    }
  }

  private async getItem<T>(key: string): Promise<T | null> {
    if (this._storage) return await this._storage.get(key);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  private async setItem<T>(key: string, value: T): Promise<void> {
    if (this._storage) {
      await this._storage.set(key, value);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  private async removeItem(key: string): Promise<void> {
    if (this._storage) {
      await this._storage.remove(key);
      return;
    }
    localStorage.removeItem(key);
  }

  // ── CONFIGURACIONES ────────────────────────────────
  async getConfig(): Promise<AppConfig> {
    await this.ensureReady();
    const c = await this.getItem<AppConfig>(this.KEY_CONFIG);
    return { ...this.defaultConfig, ...(c || {}) };
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.ensureReady();
    await this.setItem(this.KEY_CONFIG, config);
    this.aplicarTema(config.temaOscuro);
  }

  async actualizarConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
    const actual = await this.getConfig();
    const nueva = { ...actual, ...patch };
    await this.saveConfig(nueva);
    return nueva;
  }

  aplicarTema(oscuro: boolean) {
    document.body.classList.toggle('dark-theme', oscuro);
    document.documentElement.classList.toggle('dark-theme', oscuro);
  }

  // ── FOTO DE PERFIL ────────────────────────────────
  async getFotoPerfil(): Promise<string | null> {
    await this.ensureReady();
    return await this.getItem<string>(this.KEY_FOTO);
  }

  async saveFotoPerfil(dataUrl: string): Promise<void> {
    await this.ensureReady();
    await this.setItem(this.KEY_FOTO, dataUrl);
  }

  async eliminarFotoPerfil(): Promise<void> {
    await this.ensureReady();
    await this.removeItem(this.KEY_FOTO);
  }

  async getLogoEmpresa(): Promise<string | null> {
    await this.ensureReady();
    return await this.getItem<string>(this.KEY_LOGO);
  }

  async saveLogoEmpresa(dataUrl: string): Promise<void> {
    await this.ensureReady();
    await this.setItem(this.KEY_LOGO, dataUrl);
  }

  async eliminarLogoEmpresa(): Promise<void> {
    await this.ensureReady();
    await this.removeItem(this.KEY_LOGO);
  }

  // ── HISTORIAL DE COMPARTIDOS ──────────────────────
  async getCompartidos(): Promise<Compartido[]> {
    await this.ensureReady();
    const c: Compartido[] = (await this.getItem<Compartido[]>(this.KEY_COMPARTIDOS)) || [];
    return c.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async registrarCompartido(c: Omit<Compartido, 'id' | 'fecha'>): Promise<void> {
    await this.ensureReady();
    const lista = await this.getCompartidos();
    lista.unshift({
      ...c,
      id: `CMP-${Date.now()}`,
      fecha: new Date().toISOString(),
    });
    // Mantener solo los últimos 30
    const trimmed = lista.slice(0, 30);
    await this.setItem(this.KEY_COMPARTIDOS, trimmed);
  }

  async limpiarCompartidos(): Promise<void> {
    await this.ensureReady();
    await this.removeItem(this.KEY_COMPARTIDOS);
  }
}
