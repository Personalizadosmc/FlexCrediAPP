import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonInput, IonRippleEffect,
  ToastController, AlertController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, searchOutline, cardOutline, checkmarkOutline,
  checkmarkCircle, chevronForwardOutline, logoWhatsapp,
  handRightOutline, optionsOutline, printOutline, receiptOutline,
  closeOutline, shareSocialOutline, downloadOutline, documentTextOutline,
  mailOutline, notificationsOutline, sendOutline,
  qrCodeOutline, cameraOutline, imageOutline, scanOutline, trashOutline,
  informationCircleOutline, radioOutline, calendarOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { EmailService, EmailPayload } from '../../services/email.service';
import { QrService } from '../../services/qr.service';
import { ProfileService } from '../../services/profile.service';
import { NfcService } from '../../services/nfc.service';
import { WhatsappService } from '../../services/whatsapp.service';
import { ReminderService } from '../../services/reminder.service';
import { Prestamo, Cuota, Pago, Usuario } from '../../models';

@Component({
  selector: 'app-recibir-pago',
  templateUrl: './recibir-pago.page.html',
  styleUrls: ['./recibir-pago.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, IonRippleEffect],



})
export class RecibirPagoPage implements OnInit {
  prestamos: Prestamo[] = [];
  filtrados: Prestamo[] = [];
  busqueda = '';
  prestamoSel: Prestamo | null = null;
  cuotaSel: Cuota | null = null;
  usuario = '';

  facturaOpen = false;
  ultimoPago: Pago | null = null;
  ultimoPrestamo: Prestamo | null = null;
  ultimaCuotaNum = 0;
  ultimaFechaVenc = '';
  numeroRecibo = '';
  empresaUsuario: Usuario | null = null;
  logoFactura: string | null = null;
  emailEnviadoOk: boolean | null = null;  // null=no intentado, true=ok, false=error

  qrModalOpen = false;
  qrEscaneando = false;
  qrMensaje = '';

  @ViewChild('qrVideo', { static: false }) qrVideo!: ElementRef<HTMLVideoElement>;

  constructor(
    public data: DataService,
    private auth: AuthService,
    private emailSvc: EmailService,
    private qrSvc: QrService,
    private profile: ProfileService,
    private nfc: NfcService,
    private whatsapp: WhatsappService,
    private reminders: ReminderService,
    private router: Router,
    private toast: ToastController,
    private alert: AlertController,
    private loading: LoadingController
  ) {
    addIcons({
      arrowBackOutline, searchOutline, cardOutline, checkmarkOutline,
      checkmarkCircle, chevronForwardOutline, logoWhatsapp,
      handRightOutline, optionsOutline, printOutline, receiptOutline,
      closeOutline, shareSocialOutline, downloadOutline, documentTextOutline,
      mailOutline, notificationsOutline, sendOutline,
      qrCodeOutline, cameraOutline, imageOutline, scanOutline, trashOutline,
      informationCircleOutline, radioOutline, calendarOutline
    });
  }

  async abrirScanner() {
    this.qrModalOpen = true;
    this.qrMensaje = 'Preparando c\u00e1mara...';
    setTimeout(async () => {
      this.qrEscaneando = true;
      this.qrMensaje = this.qrSvc.isSupported()
        ? 'Enfoca el c\u00f3digo QR del cliente...'
        : 'Modo simulaci\u00f3n (navegador sin soporte QR)';
      const codigo = await this.qrSvc.escanear(this.qrVideo.nativeElement);
      this.qrEscaneando = false;
      if (codigo) {
        this.procesarQr(codigo);
      } else {
        this.qrMensaje = this.qrSvc.ultimoError || 'No se pudo leer el QR';
      }
    }, 400);
  }

  cerrarScanner() {
    this.qrSvc.detener();
    this.qrModalOpen = false;
    this.qrEscaneando = false;
  }

  private procesarQr(codigo: string) {
    const match = this.prestamos.find(p =>
      p.clienteId === codigo ||
      p.id === codigo ||
      p.clienteNombre.toLowerCase() === codigo.toLowerCase() ||
      codigo.includes(p.clienteId)
    );
    if (match) {
      this.seleccionar(match);
      this.mostrarToastLocal('\u2705 Cliente cargado desde QR', 'success');
    } else {
      this.mostrarToastLocal('QR le\u00eddo: ' + codigo + ' \u2014 sin coincidencia', 'warning');
    }
    this.cerrarScanner();
  }

  getQrUrlPrestamo(p: Prestamo): string {
    return this.qrSvc.generarQrUrl(p.clienteId, 180);
  }


  private async mostrarToastLocal(msg: string, color: string) {
    const t = await this.toast.create({
      message: msg, duration: 2000, color, position: 'top', cssClass: 'fc-toast'
    });
    t.present();
  }

  async ngOnInit() {
    this.cargar();
    this.empresaUsuario = this.auth.getUser();
    await this.cargarLogoFactura();
  }

  async ionViewWillEnter() {
    this.data.actualizarEstadosPrestamos();
    this.cargar();
    this.empresaUsuario = this.auth.getUser();
    await this.cargarLogoFactura();
  }

  private async cargarLogoFactura() {
    this.logoFactura = await this.profile.getLogoEmpresa();
  }

  cargar() {
    this.prestamos = this.data.getPrestamosActivos();
    this.filtrar();
  }

  filtrar() {
    const q = this.busqueda.toLowerCase();
    this.filtrados = q
      ? this.prestamos.filter(p => p.clienteNombre.toLowerCase().includes(q))
      : this.prestamos;
  }

  seleccionar(p: Prestamo) {
    if (this.prestamoSel?.id === p.id) {
      this.prestamoSel = null;
      this.cuotaSel = null;
      return;
    }
    this.prestamoSel = p;
    this.cuotaSel = p.cuotas.find(c => c.estado === 'pendiente' || c.estado === 'atrasada') || null;
  }

  getPct(p: Prestamo) {
    return Math.round(p.cuotas.filter(c => c.estado === 'pagada').length / p.numeroCuotas * 100);
  }
  getCuotasPag(p: Prestamo) { return p.cuotas.filter(c => c.estado === 'pagada').length; }
  getAtrasados()           { return this.filtrados.filter(p => p.estado === 'atrasado').length; }
  estadoLabel(e: string)   { return e === 'atrasado' ? 'Atrasado' : 'Al d\u00eda'; }
  estadoColor(e: string)   { return e === 'atrasado' ? '#dc2626' : '#059669'; }
  estadoBg(e: string)      { return e === 'atrasado' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'; }

  /**
   * Abre WhatsApp con un mensaje de recordatorio pre-redactado.
   * El usuario solo tiene que presionar "Enviar" en WhatsApp.
   */
  enviarRecordatorioWA(p: Prestamo, event: Event) {
    event.stopPropagation(); // No activar seleccionar()
    const cuotaPend = p.cuotas.find(c => c.estado === 'atrasada') ||
      p.cuotas.find(c => c.estado === 'pendiente');
    if (!cuotaPend) return;

    const empresa = this.empresaUsuario?.nombreEmpresa || 'FlexCredi';
    const tel = this.normalizarTelefonoWhatsApp(p.clienteTelefono);
    if (!tel) {
      this.mostrarToastLocal('Tel\u00e9fono de WhatsApp inv\u00e1lido. Usa el formato 809-000-0000 o +1...', 'warning');
      return;
    }
    const esAtrasada = cuotaPend.estado === 'atrasada';

    const titulo = esAtrasada ? '\u26A0\uFE0F *CUOTA VENCIDA*' : '\uD83D\uDD14 *RECORDATORIO DE PAGO*';
    const estado = esAtrasada ? '\uD83D\uDD34 ATRASADA' : '\uD83D\uDFE1 PENDIENTE';
    const msg = `${titulo}\n\n` +
      `Hola *${p.clienteNombre}*, le contactamos de parte de *${empresa}*.\n\n` +
      `*Detalles de su cuota*\n` +
      `- Cuota: *${cuotaPend.numero} de ${p.numeroCuotas}*\n` +
      `- Monto: *${this.data.formatMoney(cuotaPend.monto)}*\n` +
      `- Vencimiento: *${this.formatearFecha(cuotaPend.fechaVencimiento)}*\n` +
      `- Estado: *${estado}*\n\n` +
      `Por favor, realice su pago a la brevedad.\n\n` +
      `_Enviado desde FlexCredi_`;

    const abierto = this.whatsapp.abrirChat(tel, msg);
    if (abierto) {
      const fecha = new Date(`${cuotaPend.fechaVencimiento}T00:00:00`);
      const hoy = new Date();
      const manana = new Date();
      manana.setDate(hoy.getDate() + 1);
      const mismaFecha = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      if (mismaFecha(fecha, hoy)) this.reminders.marcarEnviado(p.id, cuotaPend.numero, 'hoy');
      if (mismaFecha(fecha, manana)) this.reminders.marcarEnviado(p.id, cuotaPend.numero, 'previo');
      this.mostrarToastLocal('Recordatorio preparado en WhatsApp', 'success');
    }
  }

  private normalizarTelefonoWhatsApp(valor?: string): string {
    let tel = (valor || '').replace(/\D/g, '');
    if (tel.startsWith('00')) tel = tel.slice(2);
    if (tel.length === 10 && /^(809|829|849)/.test(tel)) tel = `1${tel}`;
    if (tel.length === 11 && tel.startsWith('1')) return tel;
    return tel.length >= 11 ? tel : '';
  }

  private abrirWhatsApp(tel: string, msg: string) {
    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
    const opened = window.open(url, '_blank');
    if (!opened) window.location.href = url;
  }

  async registrar() {
    if (!this.prestamoSel || !this.cuotaSel) {
      const t = await this.toast.create({
        message: 'Selecciona un cliente primero',
        duration: 2200, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      });
      return t.present();
    }

    const al = await this.alert.create({
      header: 'Confirmar Pago',
      subHeader: this.prestamoSel.clienteNombre,
      message:
        `Monto a registrar:  ${this.data.formatMoney(this.cuotaSel.monto)}\n` +
        `Cuota:  ${this.cuotaSel.numero} de ${this.prestamoSel.numeroCuotas}\n` +
        `Vence:  ${this.cuotaSel.fechaVencimiento}`,
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'fc-alert-cancel' },
        { text: 'Confirmar', cssClass: 'fc-alert-confirm', handler: () => this.procesar() }
      ]
    });
    await al.present();
  }

  async procesar() {
    const load = await this.loading.create({ message: 'Procesando pago...', spinner: 'crescent' });
    await load.present();
    const monto = this.cuotaSel!.monto;

    const prestamoCopia: Prestamo = JSON.parse(JSON.stringify(this.prestamoSel));
    const cuotaNum = this.cuotaSel!.numero;
    const fechaVenc = this.cuotaSel!.fechaVencimiento;

    const nuevoPago: Pago = {
      id: this.data.generarId('PAG'),
      prestamoId: this.prestamoSel!.id,
      clienteId: this.prestamoSel!.clienteId,
      clienteNombre: this.prestamoSel!.clienteNombre,
      cuotaNumero: cuotaNum,
      monto,
      fecha: new Date().toISOString(),
      notificadoWhatsapp: false,
      emailEnviado: false,
    };
    this.data.registrarPago(nuevoPago);

    this.ultimoPago = nuevoPago;
    this.ultimoPrestamo = prestamoCopia;
    this.ultimaCuotaNum = cuotaNum;
    this.ultimaFechaVenc = fechaVenc;
    this.numeroRecibo = this.generarNumeroRecibo(nuevoPago.id);
    this.emailEnviadoOk = null;

    await load.dismiss();
    this.prestamoSel = null;
    this.cuotaSel = null;
    this.cargar();
    this.facturaOpen = true;

    await this.enviarEmailConfirmacion(prestamoCopia, nuevoPago, cuotaNum, fechaVenc);

    const t = await this.toast.create({
      message: `Pago de ${this.data.formatMoney(monto)} registrado`,
      duration: 2500, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }

  private async enviarEmailConfirmacion(p: Prestamo, pago: Pago, cuotaNum: number, fechaVenc: string) {
    const clienteActual = this.data.getClienteById(p.clienteId);
    const emailCliente = (clienteActual?.email || p.clienteEmail || '').trim().toLowerCase();
    if (!emailCliente) {
      this.emailEnviadoOk = false;
      await this.mostrarToastLocal('Pago registrado, pero el cliente no tiene correo electrónico.', 'warning');
      return;
    }

    const cuotasPagadas   = p.cuotas.filter(c => c.estado === 'pagada').length + 1;
    const restantes       = p.numeroCuotas - cuotasPagadas;
    const saldoPendiente  = restantes * p.cuotaMonto;
    const completado      = cuotasPagadas >= p.numeroCuotas;

    const payload: EmailPayload = {
      toName:        p.clienteNombre,
      toEmail:       emailCliente,
      clienteNombre: p.clienteNombre,
      cuotaNum,
      totalCuotas:   p.numeroCuotas,
      monto:         this.data.formatMoney(pago.monto),
      fechaVenc:     this.formatearFecha(fechaVenc),
      prestamoId:    p.id,
      empresa:       this.empresaUsuario?.nombreEmpresa || 'FlexCredi',
      prestamista:   this.empresaUsuario?.nombre || '',
      saldoPend:     this.data.formatMoney(saldoPendiente),
      completado,
    };

    const ok = await this.emailSvc.enviarConfirmacionPago(payload);
    this.emailEnviadoOk = ok;

    if (ok) {
      const pagos = this.data.getPagos();
      const idx = pagos.findIndex(p2 => p2.id === pago.id);
      if (idx >= 0) { pagos[idx].emailEnviado = true; localStorage.setItem('fc_pagos', JSON.stringify(pagos)); }
    } else {
      await this.mostrarToastLocal(
        this.emailSvc.ultimoError || 'No se pudo enviar la confirmación por correo.',
        'warning'
      );
    }
  }

  private generarNumeroRecibo(idPago: string): string {
    const f = new Date();
    const fecha = `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}`;
    const sufijo = idPago.split('-').pop()?.slice(-4).padStart(4, '0') || '0000';
    return `REC-${fecha}-${sufijo}`;
  }

  cerrarFactura() { this.facturaOpen = false; }

  onLogoError(ev: any) {
    const img = ev?.target as HTMLImageElement;
    if (!img) return;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'>
      <rect rx='14' width='80' height='80' fill='url(#g)'/>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#1a56db'/><stop offset='1' stop-color='#0d2252'/>
      </linearGradient></defs>
      <text x='50%' y='50%' dy='.35em' text-anchor='middle'
            font-family='Montserrat' font-size='16' font-weight='900' fill='#fcd34d'>FC</text>
    </svg>`;
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  getCuotasPagadasPrestamo(): number {
    if (!this.ultimoPrestamo) return 0;
    return this.ultimoPrestamo.cuotas.filter(c => c.estado === 'pagada').length + 1;
  }

  getSaldoPendiente(): number {
    if (!this.ultimoPrestamo) return 0;
    const pagadas = this.ultimoPrestamo.cuotas.filter(c => c.estado === 'pagada').length + 1;
    const restantes = this.ultimoPrestamo.numeroCuotas - pagadas;
    return restantes * this.ultimoPrestamo.cuotaMonto;
  }

  fechaHoy(): string {
    return new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  horaHoy(): string {
    return new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Genera un mensaje con el resumen del recibo y abre WhatsApp
   * con el número del cliente. El usuario solo presiona "Enviar".
   */
  compartirFacturaWhatsApp() {
    if (!this.ultimoPago || !this.ultimoPrestamo) return;
    const p   = this.ultimoPrestamo;
    const tel = this.normalizarTelefonoWhatsApp(p.clienteTelefono);
    if (!tel) {
      this.mostrarToastLocal('Tel\u00e9fono de WhatsApp inv\u00e1lido. Usa el formato 809-000-0000 o +1...', 'warning');
      return;
    }
    const saldo = this.getSaldoPendiente();
    const cuotasPag = this.getCuotasPagadasPrestamo();
    const empresa = this.empresaUsuario?.nombreEmpresa || 'FlexCredi';

    const msg = this.whatsapp.mensajeCompartirRecibo(
      this.ultimoPago,
      p,
      this.ultimaCuotaNum,
      this.numeroRecibo,
      empresa,
      saldo
    ) + `\nCuotas pagadas: ${cuotasPag}/${p.numeroCuotas}`;

    this.whatsapp.abrirChat(tel, msg);
  }

  async descargarFacturaPdf() {
    const blob = await this.generarPdfFactura();
    const archivo = `Recibo-${this.numeroRecibo || 'FlexCredi'}.pdf`;
    this.descargarBlob(blob, archivo);
    this.mostrarToastLocal('PDF descargado correctamente', 'success');
  }

  async compartirFacturaPdf() {
    const blob = await this.generarPdfFactura();
    const archivo = `Recibo-${this.numeroRecibo || 'FlexCredi'}.pdf`;
    const file = new File([blob], archivo, { type: 'application/pdf' });

    try {
      if ((navigator as any).share && (!(navigator as any).canShare || (navigator as any).canShare({ files: [file] }))) {
        await (navigator as any).share({
          files: [file],
          title: 'Recibo de Pago',
          text: `Recibo ${this.numeroRecibo} - ${this.ultimoPago?.clienteNombre || 'Cliente'}`
        });
        return;
      }
    } catch {
    }

    this.descargarBlob(blob, archivo);
    this.mostrarToastLocal('No se pudo abrir compartir; PDF descargado', 'warning');
  }

  async compartirFactura() {
    await this.compartirFacturaPdf();
  }

  async escribirFacturaNfc() {
    if (!this.ultimoPago || !this.ultimoPrestamo) return;

    if (!this.nfc.isSupported()) {
      this.mostrarToastLocal(this.nfc.mensajeDisponibilidad(), 'warning');
      return;
    }

    const load = await this.loading.create({
      message: 'Acerca un tag NFC para escribir...',
      spinner: 'crescent'
    });
    await load.present();

    try {
      const payload = [
        'FLEXCREDI',
        'TIPO:RECIBO',
        `RECIBO:${this.numeroRecibo}`,
        `CLIENTE_ID:${this.ultimoPago.clienteId}`,
        `CLIENTE:${this.ultimoPago.clienteNombre}`,
        `PRESTAMO:${this.ultimoPrestamo.id}`,
        `CUOTA:${this.ultimaCuotaNum}`,
        `MONTO:${this.ultimoPago.monto}`,
        `FECHA:${this.ultimoPago.fecha}`
      ].join('|');

      const ok = await this.nfc.escribir(payload);
      this.mostrarToastLocal(
        ok ? 'Datos del recibo escritos en NFC' : 'No se pudo escribir el tag NFC',
        ok ? 'success' : 'danger'
      );
    } finally {
      await load.dismiss().catch(() => undefined);
    }
  }

  private descargarBlob(blob: Blob, archivo: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private async generarPdfFactura(): Promise<Blob> {
    if (!this.ultimoPago || !this.ultimoPrestamo) {
      return new Blob([], { type: 'application/pdf' });
    }

    const p = this.ultimoPrestamo;
    const pago = this.ultimoPago;
    const empresa = this.empresaUsuario?.nombreEmpresa || 'FlexCredi';
    const prestamista = this.empresaUsuario?.nombre || '';
    const saldo = this.getSaldoPendiente();
    const cuotasPagadas = this.getCuotasPagadasPrestamo();
    const completado = saldo <= 0;
    const logoPdf = await this.prepararLogoPdf();

    const lines = [
      ...(!logoPdf ? [{ text: this.inicialesEmpresa(empresa), size: 18, bold: true, x: 64, y: 780, color: 'blue' }] : []),
      { text: empresa, size: 24, bold: true, x: 108, y: 790, color: 'white' },
      { text: 'Recibo Oficial de Pago', size: 12, bold: false, x: 108, y: 770, color: 'mutedWhite' },
      { text: 'PAGO RECIBIDO', size: 11, bold: true, x: 430, y: 783, color: 'white' },
      { text: this.numeroRecibo, size: 11, bold: true, x: 402, y: 716, color: 'blue' },
      { text: `${this.fechaHoy()}  ${this.horaHoy()}`, size: 10, bold: false, x: 402, y: 699, color: 'gray' },
      { text: 'CLIENTE', size: 10, bold: true, x: 58, y: 683, color: 'gold' },
      { text: pago.clienteNombre, size: 15, bold: true, x: 58, y: 660, color: 'blue' },
      { text: `Tel\u00e9fono: ${p.clienteTelefono || 'No registrado'}`, size: 10, bold: false, x: 58, y: 642, color: 'text' },
      { text: `Pr\u00e9stamo: ${p.id}`, size: 10, bold: false, x: 58, y: 626, color: 'text' },
      { text: 'EMITIDO POR', size: 10, bold: true, x: 320, y: 683, color: 'gold' },
      { text: empresa, size: 13, bold: true, x: 320, y: 660, color: 'blue' },
      { text: prestamista ? `Atendido por: ${prestamista}` : 'Atendido por: FlexCredi', size: 10, bold: false, x: 320, y: 642, color: 'text' },
      { text: this.empresaUsuario?.email || '', size: 10, bold: false, x: 320, y: 626, color: 'text' },
      { text: 'MONTO RECIBIDO', size: 10, bold: true, x: 58, y: 555, color: 'mutedWhite' },
      { text: this.data.formatMoney(pago.monto), size: 28, bold: true, x: 58, y: 523, color: 'white' },
      { text: `Cuota #${this.ultimaCuotaNum} de ${p.numeroCuotas}`, size: 11, bold: true, x: 58, y: 500, color: 'gold' },
      { text: 'DETALLE DEL PAGO', size: 11, bold: true, x: 58, y: 451, color: 'blue' },
      { text: `Vencimiento: ${this.ultimaFechaVenc}`, size: 10, bold: false, x: 74, y: 426, color: 'text' },
      { text: `Cuotas pagadas: ${cuotasPagadas}/${p.numeroCuotas}`, size: 10, bold: false, x: 74, y: 408, color: 'text' },
      { text: `Saldo pendiente: ${this.data.formatMoney(saldo)}`, size: 11, bold: true, x: 74, y: 390, color: completado ? 'green' : 'blue' },
      { text: 'DETALLE DEL PRESTAMO', size: 11, bold: true, x: 320, y: 451, color: 'blue' },
      { text: `Capital prestado: ${this.data.formatMoney(p.monto)}`, size: 10, bold: false, x: 336, y: 426, color: 'text' },
      { text: `Tasa de interes: ${p.interes}%`, size: 10, bold: false, x: 336, y: 408, color: 'text' },
      { text: `Total a pagar: ${this.data.formatMoney(p.totalPagar)}`, size: 10, bold: false, x: 336, y: 390, color: 'text' },
      { text: `Frecuencia: ${p.frecuencia}`, size: 10, bold: false, x: 336, y: 372, color: 'text' },
      { text: completado ? 'Pr\u00e9stamo completamente saldado.' : 'Gracias por su pago. Conserve este recibo.', size: 12, bold: true, x: 58, y: 295, color: completado ? 'green' : 'blue' },
      { text: 'Este comprobante fue generado digitalmente por FlexCredi APP.', size: 9, bold: false, x: 58, y: 92, color: 'gray' },
      { text: 'FlexCredi APP', size: 10, bold: true, x: 58, y: 72, color: 'blue' },
    ].filter(l => !!l.text);

    const pdf = this.crearPdfSimple(lines, logoPdf);
    const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Blob([bytes], { type: 'application/pdf' });
  }

  private crearPdfSimple(lines: Array<{ text: string; x: number; y: number; size: number; bold?: boolean; color?: string }>, logo?: { data: string; width: number; height: number } | null): Uint8Array {
    const esc = (v: string) => this.pdfText(v).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const colors: Record<string, string> = {
      blue: '0.05 0.13 0.32',
      gold: '0.96 0.62 0.04',
      white: '1 1 1',
      mutedWhite: '0.86 0.91 0.98',
      text: '0.12 0.16 0.22',
      gray: '0.39 0.45 0.55',
      green: '0.02 0.50 0.28',
    };
    const textLine = (l: { text: string; x: number; y: number; size: number; bold?: boolean; color?: string }) =>
      `${colors[l.color || 'text']} rg BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf ${l.x} ${l.y} Td (${esc(l.text)}) Tj ET`;
    const logoDraw = logo
      ? `q 52 0 0 52 55 758 cm /Logo Do Q`
      : '1 1 1 rg 55 762 42 42 re f\n0.96 0.62 0.04 RG 55 762 42 42 re S';
    const content = [
      '0.96 0.98 1 rg 0 0 595 842 re f',
      '0.05 0.13 0.32 rg 36 724 523 92 re f',
      '0.02 0.50 0.28 rg 414 766 112 30 re f',
      logoDraw,
      '1 1 1 rg 50 600 230 98 re f',
      '1 1 1 rg 315 600 230 98 re f',
      '0.90 0.93 0.98 RG 50 600 230 98 re S',
      '0.90 0.93 0.98 RG 315 600 230 98 re S',
      '0.05 0.13 0.32 rg 50 482 495 92 re f',
      '1 1 1 rg 50 350 230 118 re f',
      '1 1 1 rg 315 350 230 118 re f',
      '0.90 0.93 0.98 RG 50 350 230 118 re S',
      '0.90 0.93 0.98 RG 315 350 230 118 re S',
      '0.96 0.62 0.04 rg 50 332 495 3 re f',
      '1 1 1 rg 50 275 495 42 re f',
      '0.90 0.93 0.98 RG 50 275 495 42 re S',
      '0.05 0.13 0.32 rg 36 56 523 2 re f',
      ...lines.map(textLine)
    ].join('\n');

    const xObject = logo ? ' /XObject << /Logo 7 0 R >>' : '';
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObject} >> /Contents 6 0 R >> endobj`,
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj',
      `6 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`
    ];
    if (logo) {
      objects.push(`7 0 obj << /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >> stream\n${logo.data}\nendstream endobj`);
    }

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
      offsets.push(pdf.length);
      pdf += obj + '\n';
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return this.stringToPdfBytes(pdf);
  }

  private stringToPdfBytes(value: string): Uint8Array {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) {
      bytes[i] = value.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  private pdfText(value: string): string {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ');
  }

  private inicialesEmpresa(nombre: string): string {
    const partes = this.pdfText(nombre || 'FlexCredi').split(/\s+/).filter(Boolean);
    const iniciales = partes.length > 1
      ? `${partes[0][0]}${partes[1][0]}`
      : (partes[0] || 'FC').slice(0, 2);
    return iniciales.toUpperCase();
  }

  private async prepararLogoPdf(): Promise<{ data: string; width: number; height: number } | null> {
    const logo = await this.profile.getLogoEmpresa();
    if (!logo) return null;
    try {
      const jpeg = await this.convertirDataUrlAJpeg(logo, 260, 180);
      const data = atob(jpeg.split(',')[1] || '');
      const size = this.obtenerTamanoJpeg(data);
      return size ? { data, width: size.width, height: size.height } : null;
    } catch (error) {
      console.warn('[RecibirPagoPage] No se pudo incrustar el logo en PDF', error);
      return null;
    }
  }

  private convertirDataUrlAJpeg(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unavailable'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('logo load failed'));
      img.src = dataUrl;
    });
  }

  private obtenerTamanoJpeg(data: string): { width: number; height: number } | null {
    let i = 2;
    while (i < data.length) {
      if (data.charCodeAt(i) !== 0xff) return null;
      const marker = data.charCodeAt(i + 1);
      const length = (data.charCodeAt(i + 2) << 8) + data.charCodeAt(i + 3);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: (data.charCodeAt(i + 5) << 8) + data.charCodeAt(i + 6),
          width: (data.charCodeAt(i + 7) << 8) + data.charCodeAt(i + 8),
        };
      }
      i += 2 + length;
    }
    return null;
  }

  formatearFecha(iso: string): string {
    if (!iso) return '\u2014';
    const f = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return f.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private escapeHtml(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  goBack() { this.router.navigate(['/dashboard']); }
}

