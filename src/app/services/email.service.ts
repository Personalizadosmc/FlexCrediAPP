import { Injectable } from '@angular/core';

/**
 * EmailService — usa EmailJS (gratis hasta 200 emails/mes, sin backend)
 *
 * CONFIGURACIÓN INICIAL (solo 1 vez):
 * 1. Crear cuenta gratuita en https://www.emailjs.com
 * 2. Agregar un servicio de email (Gmail, Outlook, etc.)
 * 3. Crear una plantilla con las variables: {{to_name}}, {{to_email}},
 *    {{cliente_nombre}}, {{cuota_num}}, {{total_cuotas}}, {{monto}},
 *    {{fecha_vencimiento}}, {{prestamo_id}}, {{empresa}}, {{prestamista_nombre}},
 *    {{saldo_pendiente}}, {{completado}}, {{year}}
 * 4. Reemplazar las 3 constantes de abajo con tus datos reales
 */

// ──────────────────────────────────────────────────────────
//  REEMPLAZA ESTOS VALORES CON LOS DE TU CUENTA EMAILJS
// ──────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'fs_nTLgVK4rMPGyuB';   // Account → API Keys
const EMAILJS_SERVICE_ID  = 'service_jiz1p48';   // Email Services → Service ID
const EMAILJS_TEMPLATE_ID = 'template_fxtx8d6';  // Email Templates → Template ID
const EMAILJS_CONFIGURADO = (EMAILJS_PUBLIC_KEY as string) !== 'TU_PUBLIC_KEY_AQUI';
// ──────────────────────────────────────────────────────────

export interface EmailPayload {
  toName:        string;
  toEmail:       string;
  clienteNombre: string;
  cuotaNum:      number;
  totalCuotas:   number;
  monto:         string;
  fechaVenc:     string;
  prestamoId:    string;
  empresa:       string;
  prestamista:   string;
  saldoPend:     string;
  completado:    boolean;
}

@Injectable({ providedIn: 'root' })
export class EmailService {

  private sdkLoaded = false;
  ultimoError = '';

  /** Carga el SDK de EmailJS desde CDN si aún no está cargado */
  private async cargarSDK(): Promise<void> {
    if (this.sdkLoaded || (window as any).emailjs) {
      this.sdkLoaded = true;
      return;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.onload = () => {
        (window as any).emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        this.sdkLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('No se pudo cargar EmailJS'));
      document.head.appendChild(script);
    });
  }

  /**
   * Envía el correo de confirmación de pago al cliente.
   * Retorna true si el envío fue exitoso.
   */
  async enviarConfirmacionPago(data: EmailPayload): Promise<boolean> {
    this.ultimoError = '';
    if (!data.toEmail || !data.toEmail.includes('@')) {
      this.ultimoError = 'El cliente no tiene un correo electrónico válido.';
      return false;
    }

    // Si no está configurado, registrar en consola y retornar false
    if (!EMAILJS_CONFIGURADO) {
      this.ultimoError = 'El servicio de correo no está configurado.';
      console.warn('[EmailService] EmailJS no configurado. Configura las constantes en email.service.ts');
      return false;
    }

    try {
      await this.cargarSDK();
      const ejs = (window as any).emailjs;

      const templateParams = {
        to_name:          data.toName,
        to_email:         data.toEmail,
        cliente_nombre:   data.clienteNombre,
        cuota_num:        data.cuotaNum,
        total_cuotas:     data.totalCuotas,
        monto:            data.monto,
        fecha_vencimiento: data.fechaVenc,
        prestamo_id:      data.prestamoId,
        empresa:          data.empresa,
        prestamista_nombre: data.prestamista,
        saldo_pendiente:  data.saldoPend,
        completado:       data.completado ? 'Préstamo COMPLETAMENTE SALDADO 🎉' : `Saldo pendiente: ${data.saldoPend}`,
        year:             new Date().getFullYear(),
      };

      await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      return true;
    } catch (err) {
      this.ultimoError = err instanceof Error ? err.message : 'EmailJS rechazó el envío.';
      console.error('[EmailService] Error al enviar correo:', err);
      return false;
    }
  }
}
