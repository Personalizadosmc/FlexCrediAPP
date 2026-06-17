import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonInput, IonToggle, IonRippleEffect,
  ToastController, AlertController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, searchOutline, cardOutline, checkmarkOutline,
  checkmarkCircle, chevronForwardOutline, logoWhatsapp,
  handRightOutline, optionsOutline, printOutline, receiptOutline,
  closeOutline, shareSocialOutline, downloadOutline, documentTextOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Prestamo, Cuota, Pago, Usuario } from '../../models';

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
  usuario = '';

  // ─── FACTURA ───────────────────────────────────
  facturaOpen = false;
  ultimoPago: Pago | null = null;
  ultimoPrestamo: Prestamo | null = null;
  ultimaCuotaNum = 0;
  ultimaFechaVenc = '';
  numeroRecibo = '';
  empresaUsuario: Usuario | null = null;

  constructor(
    public data: DataService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastController,
    private alert: AlertController,
    private loading: LoadingController
  ) {
    addIcons({
      arrowBackOutline, searchOutline, cardOutline, checkmarkOutline,
      checkmarkCircle, chevronForwardOutline, logoWhatsapp,
      handRightOutline, optionsOutline, printOutline, receiptOutline,
      closeOutline, shareSocialOutline, downloadOutline, documentTextOutline
    });
  }

  ngOnInit() { this.cargar(); this.empresaUsuario = this.auth.getUser(); }
  ionViewWillEnter() { this.data.actualizarEstadosPrestamos(); this.cargar(); }

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
  estadoLabel(e: string)   { return e === 'atrasado' ? 'Atrasado' : 'Al día'; }
  estadoColor(e: string)   { return e === 'atrasado' ? '#dc2626' : '#059669'; }
  estadoBg(e: string)      { return e === 'atrasado' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'; }

  // ─── CONFIRMAR PAGO ─────────────────────────────
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

    // Guardar referencias para la factura ANTES de limpiar
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
      notificadoWhatsapp: this.notificarWA,
    };
    this.data.registrarPago(nuevoPago);

    // Guardar info para factura
    this.ultimoPago = nuevoPago;
    this.ultimoPrestamo = prestamoCopia;
    this.ultimaCuotaNum = cuotaNum;
    this.ultimaFechaVenc = fechaVenc;
    this.numeroRecibo = this.generarNumeroRecibo(nuevoPago.id);

    await load.dismiss();
    this.prestamoSel = null;
    this.cuotaSel = null;
    this.cargar();

    // 📄 ABRIR MODAL DE FACTURA INMEDIATAMENTE — sin demora
    this.facturaOpen = true;

    // Toast informativo (no bloquea el modal)
    const t = await this.toast.create({
      message: `Pago de ${this.data.formatMoney(monto)} registrado`,
      duration: 2500, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }

  // ─── FACTURA / RECIBO ───────────────────────────
  private generarNumeroRecibo(idPago: string): string {
    // Formato: REC-YYYYMMDD-XXXX
    const f = new Date();
    const fecha = `${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}`;
    const sufijo = idPago.split('-').pop()?.slice(-4).padStart(4, '0') || '0000';
    return `REC-${fecha}-${sufijo}`;
  }

  cerrarFactura() { this.facturaOpen = false; }

  /** Si la imagen del logo no carga, mostramos un fallback SVG inline */
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
    const f = new Date();
    return f.toLocaleDateString('es-DO', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  horaHoy(): string {
    const f = new Date();
    return f.toLocaleTimeString('es-DO', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  /**
   * Imprime la factura. Abre una ventana nueva con la factura formateada
   * y dispara window.print(). Funciona en navegador web (Ionic Serve)
   * y en Capacitor con un plugin de impresión / o vista previa de impresión.
   */
  async imprimirFactura() {
    const contenido = await this.generarHTMLFactura();
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      this.toast.create({
        message: 'No se pudo abrir la ventana. Verifica el bloqueador de pop-ups.',
        duration: 3000, color: 'danger', position: 'top',
        cssClass: 'fc-toast'
      }).then(t => t.present());
      return;
    }
    w.document.open();
    w.document.write(contenido);
    w.document.close();
    // Esperar a que las fuentes se carguen y disparar print
    w.onload = () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 400);
    };
  }

  /**
   * Comparte la factura (en móvil) o descarga (en web) usando la Web Share API
   * o un fallback de descarga HTML.
   */
  async compartirFactura() {
    const html = await this.generarHTMLFactura();
    const archivo = `Recibo-${this.numeroRecibo}.html`;

    // Web Share API (móvil moderno)
    if ((navigator as any).share && (navigator as any).canShare) {
      try {
        const blob = new Blob([html], { type: 'text/html' });
        const file = new File([blob], archivo, { type: 'text/html' });
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
            files: [file],
            title: 'Recibo de Pago',
            text: `Recibo ${this.numeroRecibo} — ${this.ultimoPago?.clienteNombre}`
          });
          return;
        }
      } catch (e) { /* fallback abajo */ }
    }

    // Fallback: descargar como archivo
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = archivo;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const t = await this.toast.create({
      message: 'Recibo descargado correctamente',
      duration: 2500, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }

  /**
   * Carga el logo como base64 para incrustarlo en el HTML de impresión.
   * Si el archivo no existe, devuelve un SVG fallback con el nombre FlexCredi.
   */
  private async cargarLogoBase64(): Promise<string> {
    try {
      const resp = await fetch('assets/flex-credi.png');
      if (!resp.ok) throw new Error('not found');
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      // Fallback: SVG inline con el nombre de la marca
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#1a56db"/>
            <stop offset="1" stop-color="#0d2252"/>
          </linearGradient>
        </defs>
        <rect rx="14" width="240" height="80" fill="url(#g)"/>
        <text x="50%" y="50%" dy=".35em" text-anchor="middle"
              font-family="Montserrat, sans-serif" font-size="30" font-weight="900"
              fill="#fff">
          <tspan fill="#93c5fd">Flex</tspan><tspan fill="#fcd34d">Credi</tspan>
        </text>
      </svg>`;
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }
  }

  /**
   * Genera el HTML profesional completo de la factura/recibo
   * para impresión o descarga.
   */
  private async generarHTMLFactura(): Promise<string> {
    if (!this.ultimoPago || !this.ultimoPrestamo) return '';

    const p = this.ultimoPrestamo;
    const pago = this.ultimoPago;
    const empresa = this.empresaUsuario?.nombre || 'FlexCredi';
    const empresaEmail = this.empresaUsuario?.email || '';
    const cuotasPagadas = this.getCuotasPagadasPrestamo();
    const saldoPendiente = this.getSaldoPendiente();
    const totalPagado = cuotasPagadas * p.cuotaMonto;
    const completado = cuotasPagadas >= p.numeroCuotas;
    const logoBase64 = await this.cargarLogoBase64();

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo ${this.numeroRecibo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9; padding: 20px; color: #0f172a; }
  .invoice { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 16px;
             box-shadow: 0 10px 40px rgba(13,34,82,0.12); overflow: hidden; }
  .header { background: linear-gradient(135deg, #0d2252 0%, #1a56db 100%); color: #fff;
            padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 16px; }
  .logo { width: 70px; height: 70px; object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
          background: rgba(255,255,255,0.10); border-radius: 14px;
          padding: 6px; border: 1.5px solid rgba(252,211,77,0.3); }
  .header h1 { font-size: 28px; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; }
  .header .sub { font-size: 13px; opacity: .8; }
  .header .badge { background: #fcd34d; color: #06102a; padding: 8px 18px;
                   border-radius: 99px; font-size: 11px; font-weight: 900;
                   letter-spacing: 1.5px; text-transform: uppercase; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 32px;
          border-bottom: 1px solid #e2e8f0; }
  .meta-block h3 { font-size: 10px; color: #94a3b8; letter-spacing: 1.5px;
                   text-transform: uppercase; margin-bottom: 8px; font-weight: 800; }
  .meta-block p { font-size: 14px; color: #1e293b; line-height: 1.6; font-weight: 600; }
  .meta-block .big { font-size: 16px; font-weight: 800; color: #0d2252; }
  .amount-section { background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding: 28px 32px;
                    text-align: center; border-bottom: 1px solid #e2e8f0; }
  .amount-section .lbl { font-size: 11px; color: #047857; letter-spacing: 2px;
                         text-transform: uppercase; font-weight: 800; margin-bottom: 8px; }
  .amount-section .amt { font-size: 44px; color: #047857; font-weight: 900; letter-spacing: -1px; }
  .amount-section .desc { font-size: 13px; color: #065f46; margin-top: 4px; font-weight: 600; }
  .details { padding: 24px 32px; }
  .details h2 { font-size: 13px; color: #64748b; letter-spacing: 1px; text-transform: uppercase;
                font-weight: 800; margin-bottom: 14px; padding-bottom: 8px;
                border-bottom: 2px solid #eff6ff; }
  .row { display: flex; justify-content: space-between; padding: 9px 0;
         border-bottom: 1px dashed #e2e8f0; }
  .row:last-child { border-bottom: none; }
  .row .k { font-size: 13px; color: #64748b; font-weight: 600; }
  .row .v { font-size: 13px; color: #0d2252; font-weight: 800; }
  .row.total { background: #f8fafc; margin: 12px -16px -10px; padding: 14px 16px;
               border-radius: 10px; border: none; }
  .row.total .k { font-size: 14px; color: #0d2252; font-weight: 900; }
  .row.total .v { font-size: 18px; color: #1a56db; font-weight: 900; }
  .row.danger .v { color: #dc2626; }
  .row.success .v { color: #047857; }
  .footer { background: #0d2252; color: #fff; padding: 22px 32px; text-align: center; }
  .footer .thanks { font-size: 16px; font-weight: 800; margin-bottom: 6px; color: #fcd34d; }
  .footer .small { font-size: 11px; opacity: .65; line-height: 1.6; }
  .signature { padding: 30px 32px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1.5px solid #1e293b; margin: 36px 12px 6px; }
  .sig-lbl { font-size: 11px; color: #64748b; font-weight: 700; }
  .stamp { display: inline-block; margin-top: 16px; padding: 10px 22px;
           border: 3px solid #10b981; color: #10b981; font-weight: 900;
           font-size: 16px; border-radius: 8px; transform: rotate(-6deg);
           letter-spacing: 2px; opacity: .85; }
  .stamp.completed { border-color: #1a56db; color: #1a56db; }
  .actions { padding: 18px 32px 28px; text-align: center; }
  .actions button { background: #1a56db; color: #fff; border: none; padding: 12px 28px;
                    border-radius: 10px; font-size: 14px; font-weight: 800; cursor: pointer;
                    margin: 0 6px; box-shadow: 0 4px 14px rgba(26,86,219,0.35); }
  .actions button:hover { background: #1748c2; }
  .actions button.gray { background: #e2e8f0; color: #475569; box-shadow: none; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice { box-shadow: none; border-radius: 0; max-width: 100%; }
    .actions { display: none !important; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="brand">
        <img src="${logoBase64}" alt="FlexCredi" class="logo" />
        <div>
          <h1>FlexCredi</h1>
          <p class="sub">Recibo Oficial de Pago</p>
        </div>
      </div>
      <div class="badge">PAGADO</div>
    </div>

    <div class="meta">
      <div class="meta-block">
        <h3>Recibo N°</h3>
        <p class="big">${this.numeroRecibo}</p>
        <p style="margin-top:8px; font-size:12px; color:#64748b;">
          ${this.fechaHoy()} · ${this.horaHoy()}
        </p>
      </div>
      <div class="meta-block" style="text-align:right;">
        <h3>Emitido por</h3>
        <p class="big">${this.escapeHtml(empresa)}</p>
        ${empresaEmail ? `<p style="font-size:12px; color:#64748b; margin-top:4px;">${this.escapeHtml(empresaEmail)}</p>` : ''}
      </div>
    </div>

    <div class="meta" style="background:#f8fafc;">
      <div class="meta-block">
        <h3>Cliente</h3>
        <p class="big">${this.escapeHtml(pago.clienteNombre)}</p>
        ${p.clienteTelefono ? `<p style="font-size:12px; color:#64748b; margin-top:4px;">📞 ${this.escapeHtml(p.clienteTelefono)}</p>` : ''}
      </div>
      <div class="meta-block" style="text-align:right;">
        <h3>Préstamo</h3>
        <p class="big">${this.escapeHtml(p.id)}</p>
        <p style="font-size:12px; color:#64748b; margin-top:4px;">
          Frecuencia: ${this.capitalize(p.frecuencia)}
        </p>
      </div>
    </div>

    <div class="amount-section">
      <p class="lbl">Monto Recibido</p>
      <p class="amt">${this.data.formatMoney(pago.monto)}</p>
      <p class="desc">Cuota #${this.ultimaCuotaNum} de ${p.numeroCuotas}</p>
    </div>

    <div class="details">
      <h2>Detalles del Préstamo</h2>
      <div class="row"><span class="k">Capital prestado</span><span class="v">${this.data.formatMoney(p.monto)}</span></div>
      <div class="row"><span class="k">Tasa de interés</span><span class="v">${p.interes}%</span></div>
      <div class="row"><span class="k">Total a pagar</span><span class="v">${this.data.formatMoney(p.totalPagar)}</span></div>
      <div class="row"><span class="k">Cuota ${this.capitalize(p.frecuencia)}</span><span class="v">${this.data.formatMoney(p.cuotaMonto)}</span></div>
      <div class="row"><span class="k">Fecha de inicio</span><span class="v">${this.formatearFecha(p.fechaInicio)}</span></div>

      <h2 style="margin-top:22px;">Estado de Pagos</h2>
      <div class="row"><span class="k">Cuota pagada en este recibo</span><span class="v">#${this.ultimaCuotaNum}</span></div>
      <div class="row"><span class="k">Fecha de vencimiento</span><span class="v">${this.formatearFecha(this.ultimaFechaVenc)}</span></div>
      <div class="row success"><span class="k">Total pagado hasta la fecha</span><span class="v">${this.data.formatMoney(totalPagado)} (${cuotasPagadas}/${p.numeroCuotas})</span></div>
      <div class="row ${saldoPendiente > 0 ? 'danger' : 'success'}">
        <span class="k">Saldo pendiente</span>
        <span class="v">${this.data.formatMoney(saldoPendiente)}</span>
      </div>

      <div class="row total">
        <span class="k">MONTO RECIBIDO</span>
        <span class="v">${this.data.formatMoney(pago.monto)}</span>
      </div>
    </div>

    <div class="signature">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-lbl">Firma del Cliente</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-lbl">Firma del Cobrador</div>
        ${completado
          ? `<div class="stamp completed">PRÉSTAMO SALDADO</div>`
          : `<div class="stamp">PAGADO</div>`}
      </div>
    </div>

    <div class="actions">
      <button onclick="window.print()">🖨️ Imprimir</button>
      <button class="gray" onclick="window.close()">Cerrar</button>
    </div>

    <div class="footer">
      <p class="thanks">¡Gracias por su pago!</p>
      <p class="small">
        Este recibo es un comprobante oficial del pago realizado.<br>
        Generado automáticamente por FlexCredi · ${this.fechaHoy()} · ${this.horaHoy()}<br>
        Recibo N° ${this.numeroRecibo}
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private formatearFecha(iso: string): string {
    if (!iso) return '—';
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
