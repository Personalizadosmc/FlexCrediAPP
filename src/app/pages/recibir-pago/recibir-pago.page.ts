import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonToggle, IonRippleEffect, AlertController, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, searchOutline, cardOutline, checkmarkOutline, checkmarkCircle, chevronForwardOutline, logoWhatsapp, handRightOutline, optionsOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { Prestamo, Cuota } from '../../models';

@Component({
  selector: 'app-recibir-pago',
  templateUrl: './recibir-pago.page.html',
  styleUrls: ['./recibir-pago.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, IonToggle, IonRippleEffect],
})
export class RecibirPagoPage implements OnInit {
  prestamos: Prestamo[] = [];
  filtrados: Prestamo[] = [];
  busqueda = '';
  prestamoSel: Prestamo | null = null;
  cuotaSel: Cuota | null = null;
  notificarWA = true;

  constructor(
    public data: DataService,
    private router: Router,
    private toastSvc: ToastService,
    private alert: AlertController,
    private loading: LoadingController
  ) {
    addIcons({ arrowBackOutline, searchOutline, cardOutline, checkmarkOutline, checkmarkCircle, chevronForwardOutline, logoWhatsapp, handRightOutline, optionsOutline });
  }

  ngOnInit() { this.cargar(); }
  ionViewWillEnter() { this.data.actualizarEstadosPrestamos(); this.cargar(); }

  cargar() { this.prestamos = this.data.getPrestamosActivos(); this.filtrar(); }
  filtrar() {
    const q = this.busqueda.toLowerCase();
    this.filtrados = q ? this.prestamos.filter(p => p.clienteNombre.toLowerCase().includes(q)) : this.prestamos;
  }

  seleccionar(p: Prestamo) {
    if (this.prestamoSel?.id === p.id) { this.prestamoSel = null; this.cuotaSel = null; return; }
    this.prestamoSel = p;
    this.cuotaSel = p.cuotas.find(c => c.estado === 'pendiente' || c.estado === 'atrasada') || null;
  }

  getPct(p: Prestamo)      { return Math.round(p.cuotas.filter(c => c.estado === 'pagada').length / p.numeroCuotas * 100); }
  getCuotasPag(p: Prestamo){ return p.cuotas.filter(c => c.estado === 'pagada').length; }
  getAtrasados()           { return this.filtrados.filter(p => p.estado === 'atrasado').length; }
  estadoLabel(e: string)   { return e === 'atrasado' ? 'Atrasado' : 'Al día'; }
  estadoColor(e: string)   { return e === 'atrasado' ? '#dc2626' : '#059669'; }
  estadoBg(e: string)      { return e === 'atrasado' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'; }

  async registrar() {
    if (!this.prestamoSel || !this.cuotaSel)
      return this.toastSvc.warning('Selecciona un cliente primero');

    const al = await this.alert.create({
      header: 'Confirmar Pago',
      subHeader: this.prestamoSel.clienteNombre,
      message:
        `Monto:  ${this.data.formatMoney(this.cuotaSel.monto)}\n` +
        `Cuota:  ${this.cuotaSel.numero} de ${this.prestamoSel.numeroCuotas}\n` +
        `Vence:  ${this.cuotaSel.fechaVencimiento}`,
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar',  role: 'cancel', cssClass: 'fc-alert-cancel'  },
        { text: 'Confirmar', cssClass: 'fc-alert-confirm', handler: () => this.procesar() }
      ]
    });
    await al.present();
  }

  async procesar() {
    const load = await this.loading.create({ message: 'Procesando pago...', spinner: 'crescent' });
    await load.present();
    const monto = this.cuotaSel!.monto;
    const nombre = this.prestamoSel!.clienteNombre;
    this.data.registrarPago({
      id: this.data.generarId('PAG'),
      prestamoId: this.prestamoSel!.id,
      clienteId: this.prestamoSel!.clienteId,
      clienteNombre: nombre,
      cuotaNumero: this.cuotaSel!.numero,
      monto,
      fecha: new Date().toISOString(),
      notificadoWhatsapp: this.notificarWA,
    });
    await load.dismiss();
    this.prestamoSel = null;
    this.cuotaSel = null;
    this.cargar();
    await this.toastSvc.success(`Pago de ${this.data.formatMoney(monto)} registrado — ${nombre}`);
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
