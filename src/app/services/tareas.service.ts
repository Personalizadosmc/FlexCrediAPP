import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Tarea } from '../models';

/** Persistencia y operaciones CRUD de tareas. */
@Injectable({ providedIn: 'root' })
export class TareasService {

  private _storage: Storage | null = null;
  private readonly KEY = 'fc_tareas';
  private readonly FALLBACK_KEY = 'fc_tareas_fallback';
  private ready: Promise<void>;

  constructor(private storage: Storage) {
    this.ready = this.init();
  }

  async init(): Promise<void> {
    try {
      const store = await this.storage.create();
      this._storage = store;
    } catch (error) {
      console.warn('[TareasService] Ionic Storage no disponible, usando localStorage', error);
      this._storage = null;
    }
  }

  /** Asegura que el storage esté listo antes de operar */
  private async ensureReady(): Promise<void> {
    await this.ready;
    if (!this._storage) {
      try {
        this._storage = await this.storage.create();
      } catch (error) {
        console.warn('[TareasService] Persistencia avanzada no disponible', error);
      }
    }
  }

  private async leer(): Promise<Tarea[]> {
    if (this._storage) {
      return (await this._storage.get(this.KEY)) || [];
    }

    const raw = localStorage.getItem(this.FALLBACK_KEY) || localStorage.getItem(this.KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  private async guardar(lista: Tarea[]): Promise<void> {
    if (this._storage) {
      await this._storage.set(this.KEY, lista);
      return;
    }

    localStorage.setItem(this.FALLBACK_KEY, JSON.stringify(lista));
  }

  // ── LEER TODAS ───────────────────────────────────────
  async getTareas(): Promise<Tarea[]> {
    await this.ensureReady();
    const t = await this.leer();
    return t
      .map((tarea, index) => ({
        ...tarea,
        estado: tarea.estado || (tarea.completada ? 'completada' : 'pendiente'),
        completada: tarea.estado === 'completada' || tarea.completada,
        orden: Number.isFinite(tarea.orden) ? tarea.orden : index
      }))
      .sort((a, b) => a.orden - b.orden);
  }

  // ── CREAR ────────────────────────────────────────────
  async agregarTarea(tarea: Omit<Tarea, 'id' | 'fechaCreacion' | 'orden'>): Promise<Tarea> {
    await this.ensureReady();
    const existentes = await this.getTareas();
    const nueva: Tarea = {
      ...tarea,
      estado: tarea.estado || 'pendiente',
      completada: tarea.estado === 'completada' || tarea.completada,
      id: `T-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      fechaCreacion: new Date().toISOString(),
      orden: existentes.length,
    };
    existentes.push(nueva);
    await this.guardar(existentes);
    return nueva;
  }

  // ── ACTUALIZAR ──────────────────────────────────────
  async actualizarTarea(tarea: Tarea): Promise<void> {
    await this.ensureReady();
    const lista = await this.getTareas();
    const idx = lista.findIndex(t => t.id === tarea.id);
    if (idx >= 0) {
      lista[idx] = tarea;
      await this.guardar(lista);
    }
  }

  // ── TOGGLE COMPLETADA ────────────────────────────────
  async toggleCompletada(id: string): Promise<void> {
    await this.ensureReady();
    const lista = await this.getTareas();
    const t = lista.find(x => x.id === id);
    if (t) {
      t.estado = t.estado === 'completada' ? 'pendiente' : 'completada';
      t.completada = t.estado === 'completada';
      await this.guardar(lista);
    }
  }

  async cambiarEstado(id: string, estado: 'pendiente' | 'completada' | 'cancelada'): Promise<void> {
    await this.ensureReady();
    const lista = await this.getTareas();
    const t = lista.find(x => x.id === id);
    if (t) {
      t.estado = estado;
      t.completada = estado === 'completada';
      await this.guardar(lista);
    }
  }

  // ── ELIMINAR ─────────────────────────────────────────
  async eliminarTarea(id: string): Promise<void> {
    await this.ensureReady();
    const lista = (await this.getTareas()).filter(t => t.id !== id);
    // Reordenar
    lista.forEach((t, i) => t.orden = i);
    await this.guardar(lista);
  }

  // ── REORDENAR (drag & drop de ion-reorder) ──────────
  async reordenar(from: number, to: number): Promise<void> {
    await this.ensureReady();
    const lista = await this.getTareas();
    const [movida] = lista.splice(from, 1);
    if (!movida) return;
    lista.splice(to, 0, movida);
    lista.forEach((t, i) => t.orden = i);
    await this.guardar(lista);
  }

  // ── LIMPIAR COMPLETADAS ─────────────────────────────
  async limpiarCompletadas(): Promise<number> {
    await this.ensureReady();
    const lista = await this.getTareas();
    const activas = lista.filter(t => (t.estado || (t.completada ? 'completada' : 'pendiente')) !== 'completada');
    activas.forEach((t, i) => t.orden = i);
    await this.guardar(activas);
    return lista.length - activas.length;
  }

  // ── ESTADÍSTICAS ────────────────────────────────────
  async getStats(): Promise<{total: number; completadas: number; pendientes: number; canceladas: number; altaPrioridad: number}> {
    const t = await this.getTareas();
    return {
      total:         t.length,
      completadas:   t.filter(x => x.estado === 'completada').length,
      pendientes:    t.filter(x => x.estado === 'pendiente').length,
      canceladas:    t.filter(x => x.estado === 'cancelada').length,
      altaPrioridad: t.filter(x => x.estado === 'pendiente' && x.prioridad === 'alta').length,
    };
  }
}
