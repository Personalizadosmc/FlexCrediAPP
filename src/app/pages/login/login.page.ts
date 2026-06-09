import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonIcon, IonRippleEffect, IonSpinner, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, mailOutline, lockClosedOutline, personOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonIcon, IonRippleEffect, IonSpinner],
})
export class LoginPage {
  modo: 'login' | 'registro' = 'login';
  email = ''; password = ''; nombre = ''; confirmPass = '';
  showPass = false; loadingState = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastSvc: ToastService,
    private alert: AlertController
  ) {
    addIcons({ eyeOutline, eyeOffOutline, mailOutline, lockClosedOutline, personOutline });
  }

  async onLogin() {
    if (this.loadingState) return;
    if (!this.email.trim() || !this.password.trim())
      return this.toastSvc.warning('Por favor, completa todos los campos');
    if (!this.validarEmail(this.email))
      return this.toastSvc.warning('El correo electrónico no es válido');

    this.loadingState = true;
    setTimeout(() => {
      const r = this.auth.login(this.email.trim(), this.password);
      this.loadingState = false;
      if (r.ok) {
        this.toastSvc.success('¡Bienvenido de nuevo!');
        this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      } else {
        this.toastSvc.error(r.msg);
      }
    }, 700);
  }

  async onRegistro() {
    if (this.loadingState) return;
    if (!this.nombre.trim() || !this.email.trim() || !this.password.trim())
      return this.toastSvc.warning('Por favor, completa todos los campos');
    if (!this.validarEmail(this.email))
      return this.toastSvc.warning('El correo electrónico no es válido');
    if (this.password.length < 6)
      return this.toastSvc.warning('La contraseña debe tener al menos 6 caracteres');
    if (this.password !== this.confirmPass)
      return this.toastSvc.warning('Las contraseñas no coinciden');

    this.loadingState = true;
    setTimeout(() => {
      const r = this.auth.registrar(this.nombre.trim(), this.email.trim(), this.password);
      this.loadingState = false;
      if (r.ok) {
        this.toastSvc.success('¡Cuenta creada! Ahora inicia sesión');
        this.modo = 'login';
        this.password = ''; this.confirmPass = ''; this.nombre = '';
      } else {
        this.toastSvc.error(r.msg);
      }
    }, 800);
  }

  async olvidoContrasena() {
    const al = await this.alert.create({
      header: 'Recuperar contraseña',
      message: 'La recuperación automática no está disponible.\nPor favor crea una cuenta nueva o contacta al administrador.',
      cssClass: 'fc-alert',
      buttons: [{ text: 'Entendido', role: 'cancel', cssClass: 'fc-alert-cancel' }]
    });
    await al.present();
  }

  private validarEmail(e: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  }
}
