import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonInput, IonList, IonItem, IonLabel,
  IonItemSliding, IonItemOptions, IonItemOption,
  IonToggle, IonReorder, IonReorderGroup,
  IonBadge, IonRippleEffect, IonModal,
  IonRefresher, IonRefresherContent,
  AlertController, ToastController, LoadingController,
  ItemReorderEventDetail
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, addOutline, listOutline, trashOutline,
  createOutline, checkmarkOutline, closeOutline, callOutline,
  walkOutline, cashOutline, ellipsisHorizontalOutline,
  alertCircleOutline, timeOutline, sparklesOutline,
  homeOutline, newspaperOutline, mapOutline, personOutline,
  flashOutline, flagOutline, saveOutline
} from 'ionicons/icons';
import { TareasService } from '../../services/tareas.service';
import { DataService } from '../../services/data.service';
import { Tarea, Cliente } from '../../models';

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.page.html',
  styleUrls: ['./tareas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonContent, IonIcon, IonInput, IonList, IonItem, IonLabel,
    IonItemSliding, IonItemOptions, IonItemOption,
    IonToggle, IonReorder, IonReorderGroup,
    IonBadge, IonRippleEffect, IonModal,
    IonRefresher, IonRefresherContent,
  ],
})
export class TareasPage implements OnInit {

  tareas: Tarea[] = [];
  clientes: Cliente[] = [];
  stats = { total: 0, completadas: 0, pendientes: 0, canceladas: 0, altaPrioridad: 0 };
  vista: 'pendiente' | 'completada' | 'cancelada' = 'pendiente';

  // Modal de crear/editar
  modalOpen = false;
  editando: Tarea | null = null;

  // Formulario
  form: Partial<Tarea> = {
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    tipo: 'general',
    completada: false,
    estado: 'pendiente',
    clienteId: '',
    fechaLimite: '',
  };

  // Long-press
  private longPressTimer: any = null;

  constructor(
    private tareasSvc: TareasService,
    private dataSvc:   DataService,
    private router:    Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
  ) {
    addIcons({
      arrowBackOutline, addOutline, listOutline, trashOutline,
      createOutline, checkmarkOutline, closeOutline, callOutline,
      walkOutline, cashOutline, ellipsisHorizontalOutline,
      alertCircleOutline, timeOutline, sparklesOutline,
      homeOutline, newspaperOutline, mapOutline, personOutline,
      flashOutline, flagOutline, saveOutline
    });
  }

  async ngOnInit() {
    this.clientes = this.dataSvc.getClientes();
    await this.cargar();
  }

  async ionViewWillEnter() {
    this.clientes = this.dataSvc.getClientes();
    await this.cargar();
  }

  async cargar(event?: any) {
    try {
      this.tareas = await this.tareasSvc.getTareas();
      this.stats  = await this.tareasSvc.getStats();
    } catch (error) {
      console.error('[TareasPage] Error cargando tareas', error);
      this.toast('No se pudieron cargar las tareas', 'danger');
    } finally {
      event?.target?.complete?.();
    }
  }

  onRefresh(event: any) { this.cargar(event); }

  get tareasFiltradas(): Tarea[] {
    return this.tareas.filter(t => this.estadoDe(t) === this.vista);
  }

  estadoDe(t: Tarea): 'pendiente' | 'completada' | 'cancelada' {
    return (t.estado || (t.completada ? 'completada' : 'pendiente')) as 'pendiente' | 'completada' | 'cancelada';
  }

  setVista(v: 'pendiente' | 'completada' | 'cancelada') { this.vista = v; }

  // ── CREAR / EDITAR ────────────────────────────────────
  abrirModalCrear() {
    this.editando = null;
    this.form = {
      titulo: '', descripcion: '',
      prioridad: 'media', tipo: 'general', completada: false, estado: 'pendiente',
      clienteId: '', fechaLimite: '',
    };
    this.modalOpen = true;
  }

  abrirModalEditar(t: Tarea) {
    this.editando = t;
    this.form = { ...t };
    this.modalOpen = true;
  }

  cerrarModal() { this.modalOpen = false; this.editando = null; }

  async guardar() {
    if (!this.form.titulo?.trim()) {
      return this.toast('El título es obligatorio', 'warning');
    }
    const load = await this.loadingCtrl.create({
      message: this.editando ? 'Actualizando...' : 'Guardando tarea...',
      spinner: 'crescent'
    });
    await load.present();

    try {
      if (this.form.clienteId) {
        const c = this.clientes.find(x => x.id === this.form.clienteId);
        this.form.clienteNombre = c?.nombre || '';
      } else {
        this.form.clienteNombre = '';
      }

      if (this.editando) {
        const actualizada: Tarea = { ...this.editando, ...this.form } as Tarea;
        await this.tareasSvc.actualizarTarea(actualizada);
        this.toast('Tarea actualizada', 'success');
      } else {
        await this.tareasSvc.agregarTarea({
          titulo:       this.form.titulo!.trim(),
          descripcion:  this.form.descripcion || '',
          prioridad:    (this.form.prioridad as any) || 'media',
          tipo:         (this.form.tipo as any) || 'general',
          completada:   false,
          estado:       'pendiente',
          clienteId:    this.form.clienteId,
          clienteNombre: this.form.clienteNombre,
          fechaLimite:  this.form.fechaLimite,
        });
        this.toast('Tarea agregada', 'success');
      }

      this.cerrarModal();
      await this.cargar();
    } catch (error) {
      console.error('[TareasPage] Error guardando tarea', error);
      this.toast('No se pudo guardar la tarea', 'danger');
    } finally {
      await load.dismiss();
    }
  }

  // ── SWIPE: eliminar ──────────────────────────────────
  async eliminar(t: Tarea, sliding?: any) {
    if (sliding) await sliding.close();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar tarea',
      message: `¿Estás seguro de eliminar "${t.titulo}"?`,
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'fc-alert-cancel' },
        { text: 'Eliminar', cssClass: 'fc-alert-danger', handler: async () => {
          await this.tareasSvc.eliminarTarea(t.id);
          this.toast('Tarea eliminada', 'success');
          await this.cargar();
        }}
      ]
    });
    await alert.present();
  }

  // ── CHECKBOX ─────────────────────────────────────────
  async toggle(t: Tarea) {
    await this.tareasSvc.cambiarEstado(t.id, this.estadoDe(t) === 'completada' ? 'pendiente' : 'completada');
    await this.cargar();
  }

  async completar(t: Tarea, event?: Event) {
    event?.stopPropagation();
    await this.tareasSvc.cambiarEstado(t.id, 'completada');
    this.toast('Tarea completada', 'success');
    await this.cargar();
  }

  async cancelar(t: Tarea, event?: Event) {
    event?.stopPropagation();
    await this.tareasSvc.cambiarEstado(t.id, 'cancelada');
    this.toast('Tarea cancelada', 'warning');
    await this.cargar();
  }

  async reabrir(t: Tarea, event?: Event) {
    event?.stopPropagation();
    await this.tareasSvc.cambiarEstado(t.id, 'pendiente');
    this.toast('Tarea reabierta', 'success');
    await this.cargar();
  }

  // ── REORDER ──────────────────────────────────────────
  async onReorder(event: CustomEvent<ItemReorderEventDetail>) {
    await this.tareasSvc.reordenar(event.detail.from, event.detail.to);
    event.detail.complete();
    await this.cargar();
  }

  // ── LONG PRESS ───────────────────────────────────────
  onPressStart(t: Tarea) {
    this.longPressTimer = setTimeout(() => {
      this.abrirModalEditar(t);
    }, 600);
  }
  onPressEnd() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // ── LIMPIAR COMPLETADAS ──────────────────────────────
  async limpiarCompletadas() {
    const n = this.stats.completadas;
    if (n === 0) return this.toast('No hay tareas completadas', 'warning');
    const alert = await this.alertCtrl.create({
      header: 'Limpiar completadas',
      message: `¿Eliminar ${n} tareas completadas?`,
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'fc-alert-cancel' },
        { text: 'Eliminar', cssClass: 'fc-alert-danger', handler: async () => {
          const eliminadas = await this.tareasSvc.limpiarCompletadas();
          this.toast(`${eliminadas} tareas eliminadas`, 'success');
          await this.cargar();
        }}
      ]
    });
    await alert.present();
  }

  // ── HELPERS ──────────────────────────────────────────
  iconoTipo(t: string): string {
    const map: Record<string, string> = {
      llamada:  'call-outline',
      visita:   'walk-outline',
      cobro:    'cash-outline',
      general:  'ellipsis-horizontal-outline',
    };
    return map[t] || 'ellipsis-horizontal-outline';
  }

  colorPrioridad(p: string): string {
    return p === 'alta' ? '#dc2626' : p === 'media' ? '#f59e0b' : '#059669';
  }

  labelPrioridad(p: string): string {
    return p === 'alta' ? 'Alta' : p === 'media' ? 'Media' : 'Baja';
  }

  ir(r: string) {
    this.modalOpen = false;
    this.editando = null;
    setTimeout(() => this.router.navigate([r]), 120);
  }

  private async toast(msg: string, color: string) {
    const t = await this.toastCtrl.create({
      message: msg, duration: 2200, color, position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }
}
