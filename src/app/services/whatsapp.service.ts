import { Injectable } from '@angular/core';
import { Prestamo, Cuota, Pago } from '../models';

/** Abre WhatsApp mediante wa.me con mensajes previamente preparados. */
@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly DEFAULT_COUNTRY_CODE = '1';

  formatearTelefono(tel: string): string {
    if (!tel) return '';
    let limpio = tel.replace(/[^\d+]/g, '');
    if (limpio.startsWith('+')) limpio = limpio.slice(1);
    if (limpio.startsWith('00')) limpio = limpio.slice(2);
    if (limpio.length === 10) limpio = this.DEFAULT_COUNTRY_CODE + limpio;
    return limpio;
  }

  construirUrl(telefono: string, mensaje: string): string {
    return `https://wa.me/${this.formatearTelefono(telefono)}?text=${encodeURIComponent(mensaje)}`;
  }

  abrirChat(telefono: string, mensaje: string): boolean {
    const tel = this.formatearTelefono(telefono);
    if (!tel) return false;
    const url = this.construirUrl(tel, mensaje);
    const ventana = window.open(url, '_blank');
    if (!ventana) window.location.href = url;
    return true;
  }

  mensajeReciboPago(
    pago: Pago,
    prestamo: Prestamo,
    cuotaNum: number,
    fechaVenc: string,
    numeroRecibo: string,
    empresaNombre: string,
    cuotasPagadas: number,
    saldoPendiente: number
  ): string {
    const completado = saldoPendiente === 0
      ? '\n\uD83C\uDF89 *FELICIDADES!* Has completado el pago total del pr\u00e9stamo.\n'
      : `\n\uD83D\uDCC5 Pr\u00f3ximo vencimiento: ${this.formatearFecha(fechaVenc)}\n`;

    return `\uD83E\uDDFE *RECIBO DE PAGO - ${empresaNombre}*\n\n` +
      `Hola *${pago.clienteNombre}*. Confirmamos la recepci\u00f3n de tu pago.\n\n` +
      `\uD83D\uDCCC Recibo: *${numeroRecibo}*\n` +
      `\uD83D\uDCC5 Fecha: ${this.formatearFechaCorta(new Date().toISOString())}\n` +
      `\uD83D\uDCB5 Monto recibido: *${this.formatMoney(pago.monto)}*\n` +
      `\uD83D\uDCCB Cuota: *${cuotaNum} de ${prestamo.numeroCuotas}*\n\n` +
      `Cuotas pagadas: ${cuotasPagadas}/${prestamo.numeroCuotas}\n` +
      `Saldo pendiente: *${this.formatMoney(saldoPendiente)}*\n` +
      completado + `\n_Enviado desde ${empresaNombre}_`;
  }

  mensajeRecordatorioPrevio(prestamo: Prestamo, cuota: Cuota, empresaNombre: string): string {
    return `\uD83D\uDD14 *RECORDATORIO DE PAGO*\n\n` +
      `Hola *${prestamo.clienteNombre}*.\n\n` +
      `Te recordamos que ma\u00f1ana vence tu pr\u00f3xima cuota:\n\n` +
      `\uD83D\uDCB5 Monto: *${this.formatMoney(cuota.monto)}*\n` +
      `\uD83D\uDCCB Cuota: *${cuota.numero} de ${prestamo.numeroCuotas}*\n` +
      `\uD83D\uDCC5 Vencimiento: *${this.formatearFecha(cuota.fechaVencimiento)}*\n\n` +
      `Por favor, prepara tu pago para evitar atrasos.\n\n` +
      `_Enviado desde ${empresaNombre}_`;
  }

  mensajeRecordatorioHoy(prestamo: Prestamo, cuota: Cuota, empresaNombre: string): string {
    return `\u26A0\uFE0F *PAGO VENCE HOY*\n\n` +
      `Hola *${prestamo.clienteNombre}*.\n\n` +
      `\uD83D\uDCB5 Monto: *${this.formatMoney(cuota.monto)}*\n` +
      `\uD83D\uDCCB Cuota: *${cuota.numero} de ${prestamo.numeroCuotas}*\n` +
      `\uD83D\uDCC5 Vence hoy: *${this.formatearFecha(cuota.fechaVencimiento)}*\n\n` +
      `Por favor, realiza tu pago lo antes posible.\n\n` +
      `_Enviado desde ${empresaNombre}_`;
  }

  mensajeCompartirRecibo(
    pago: Pago,
    prestamo: Prestamo,
    cuotaNum: number,
    numeroRecibo: string,
    empresaNombre: string,
    saldoPendiente: number
  ): string {
    return `\uD83E\uDDFE *RECIBO DE PAGO*\n${empresaNombre}\n\n` +
      `Cliente: *${pago.clienteNombre}*\n` +
      `Recibo: ${numeroRecibo}\n` +
      `Fecha: ${this.formatearFechaCorta(new Date().toISOString())}\n\n` +
      `\uD83D\uDCB5 Monto pagado: *${this.formatMoney(pago.monto)}*\n` +
      `\uD83D\uDCCB Cuota: *${cuotaNum} de ${prestamo.numeroCuotas}*\n` +
      `Saldo pendiente: *${this.formatMoney(saldoPendiente)}*\n\n` +
      `Gracias por tu pago.`;
  }

  private formatMoney(n: number): string {
    return 'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  private formatearFecha(iso: string): string {
    if (!iso) return '-';
    const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    return fecha.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private formatearFechaCorta(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' - ' + fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
  }
}
