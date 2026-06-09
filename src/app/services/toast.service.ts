import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

const CONFIG: Record<ToastType, { icon: string; cssClass: string }> = {
  success: { icon: 'checkmark-circle-outline', cssClass: 'fc-toast fc-toast-success' },
  danger:  { icon: 'close-circle-outline',     cssClass: 'fc-toast fc-toast-danger'  },
  warning: { icon: 'warning-outline',           cssClass: 'fc-toast fc-toast-warning' },
  info:    { icon: 'information-circle-outline',cssClass: 'fc-toast fc-toast-info'    },
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private ctrl: ToastController) {}

  async show(message: string, type: ToastType = 'info', duration = 3000) {
    const cfg = CONFIG[type];
    // Descartar cualquier toast anterior para evitar apilamiento
    await this.ctrl.dismiss().catch(() => {});
    const t = await this.ctrl.create({
      message,
      duration,
      position: 'top',
      cssClass: cfg.cssClass,
      icon: cfg.icon,
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await t.present();
  }

  success(msg: string, duration = 3000) { return this.show(msg, 'success', duration); }
  error(msg: string,   duration = 3000) { return this.show(msg, 'danger',  duration); }
  warning(msg: string, duration = 3000) { return this.show(msg, 'warning', duration); }
  info(msg: string,    duration = 3000) { return this.show(msg, 'info',    duration); }
}
