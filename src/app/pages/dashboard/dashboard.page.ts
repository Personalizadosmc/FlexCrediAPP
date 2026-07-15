import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRippleEffect,
  NavController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, logOutOutline, homeOutline,
  peopleOutline, cardOutline, barChartOutline, addCircleOutline,
  timeOutline, wifiOutline, cloudOfflineOutline, closeOutline,
  cellularOutline, layersOutline, shieldCheckmarkOutline,
  syncOutline, informationCircleOutline,
  listOutline, newspaperOutline, mapOutline, personOutline,
  headsetOutline, receiptOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AuthService }    from '../../services/auth.service';
import { DataService }    from '../../services/data.service';
import { NetworkService } from '../../services/network.service';
import { ReminderService } from '../../services/reminder.service';
import { Prestamo }       from '../../models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, IonContent, IonIcon, IonRippleEffect],
})
export class DashboardPage implements OnInit, OnDestroy {
  usuario = ''; iniciales = '';
  frecuencia: 'semanal' | 'quincenal' | 'mensual' = 'semanal';
  stats: any = {};
  prestamos: Prestamo[] = [];

  // Modal de red
  redModalOpen = false;
  pendingCount  = 0;
  reminderCount = 0;

  private netSub: Subscription | null = null;

  constructor(
    private auth: AuthService,
    public  data: DataService,
    public  network: NetworkService,
    private reminders: ReminderService,
    private router: Router,
    private navController: NavController,
    private toast: ToastController
  ) {
    addIcons({
      notificationsOutline, logOutOutline, homeOutline,
      peopleOutline, cardOutline, barChartOutline, addCircleOutline,
      timeOutline, wifiOutline, cloudOfflineOutline, closeOutline,
      cellularOutline, layersOutline, shieldCheckmarkOutline,
      syncOutline, informationCircleOutline,
      listOutline, newspaperOutline, mapOutline, personOutline,
      headsetOutline, receiptOutline
    });
  }

  ngOnInit() {
    const u = this.auth.getUser();
    this.usuario  = u?.nombre || 'Usuario';
    this.iniciales = this.data.getIniciales(this.usuario);
    this.cargar();

    // Escuchar cambios de red para toasts automáticos
    this.netSub = this.network.state$.subscribe(async estado => {
      // Solo disparar toast si el modal NO está abierto
      if (this.redModalOpen) return;
      if (!estado.connected) {
        const t = await this.toast.create({
          message: 'Sin conexión — modo offline activado',
          duration: 3500, color: 'warning', position: 'top',
          cssClass: 'fc-toast'
        });
        t.present();
      }
    });
  }

  ionViewWillEnter() {
    this.data.actualizarEstadosPrestamos();
    this.cargar();
    this.pendingCount = this.network.obtenerCola().length;
  }

  ngOnDestroy() { this.netSub?.unsubscribe(); }

  cargar() {
    this.stats = this.data.getStats();
    this.reminderCount = this.reminders.contarPendientes();
    this.prestamos = this.data.getPrestamosActivos()
      .filter(p => p.frecuencia === this.frecuencia).slice(0, 5);
  }

  setFrecuencia(f: 'semanal' | 'quincenal' | 'mensual') {
    this.frecuencia = f; this.cargar();
  }

  // ── Modal red ──────────────────────────────────────────
  abrirRedModal() {
    this.pendingCount = this.network.obtenerCola().length;
    this.redModalOpen = true;
  }
  cerrarRedModal() { this.redModalOpen = false; }

  async sincronizarManual() {
    await this.network.sincronizarColaPendiente();
    this.pendingCount = 0;
    const t = await this.toast.create({
      message: 'Datos sincronizados correctamente',
      duration: 2500, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }

  // ── Helpers ────────────────────────────────────────────
  getPct(p: Prestamo) {
    return Math.round(p.cuotas.filter(c => c.estado === 'pagada').length / p.numeroCuotas * 100);
  }
  estadoLabel(e: string) { return e === 'activo' ? 'Al día' : e === 'atrasado' ? 'Atrasado' : 'Listo'; }
  estadoColor(e: string) { return e === 'activo' ? '#059669' : e === 'atrasado' ? '#dc2626' : '#64748b'; }
  estadoBg(e: string)    { return e === 'activo' ? 'rgba(16,185,129,0.12)' : e === 'atrasado' ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.1)'; }

  async logout() {
    const t = await this.toast.create({
      message: 'Hasta luego, ' + this.usuario,
      duration: 1500, color: 'medium', position: 'top',
      cssClass: 'fc-toast'
    });
    await t.present();
    setTimeout(() => {
      this.auth.logout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }, 900);
  }

  ir(r: string) { this.router.navigateByUrl(r); }

  abrirReportes(event: MouseEvent) {
    (event.currentTarget as HTMLButtonElement | null)?.blur();
    void this.navController.navigateForward('/reportes', { animated: false });
  }

}
