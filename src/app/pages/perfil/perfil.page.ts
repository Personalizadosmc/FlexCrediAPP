import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonInput, IonBadge,
  IonRippleEffect, IonSpinner, IonModal,
  AlertController, ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, personOutline, cameraOutline, imageOutline,
  logOutOutline, moonOutline, notificationsOutline, volumeHighOutline,
  syncOutline, phonePortraitOutline, bluetoothOutline, wifiOutline,
  qrCodeOutline, shareSocialOutline, trashOutline, checkmarkOutline,
  closeOutline, createOutline, radioOutline, businessOutline,
  homeOutline, listOutline, newspaperOutline, mapOutline,
  timeOutline, alertCircleOutline, informationCircleOutline,
  scanOutline, chevronForwardOutline, cardOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { CameraService } from '../../services/camera.service';
import { NfcService } from '../../services/nfc.service';
import { BluetoothService, DispositivoBLE } from '../../services/bluetooth.service';
import { AppConfig, Compartido, Usuario } from '../../models';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonContent, IonIcon, IonCard, IonCardContent,
    IonList, IonItem, IonLabel, IonInput, IonBadge,
    IonRippleEffect, IonSpinner, IonModal,
  ],
})
export class PerfilPage implements OnInit {

  usuario: any = { nombre: '', email: '', nombreEmpresa: '' };
  fotoPerfil: string | null = null;
  logoEmpresa: string | null = null;
  config: AppConfig = {
    temaOscuro: false, notificaciones: true, sonidos: true,
    autoSincronizar: true, vibracion: true
  };

  compartidos: Compartido[] = [];

  // BLE
  bleModalOpen = false;
  escaneandoBle = false;
  dispositivosBle: DispositivoBLE[] = [];
  compartiendoNfc = false;

  // Editar nombre
  editarNombreOpen = false;
  nombreEmpresaTemp = '';
  editarPerfilOpen = false;
  perfilForm: Partial<Usuario> = {};

  constructor(
    private auth: AuthService,
    private profile: ProfileService,
    private camera: CameraService,
    private nfc: NfcService,
    private bluetooth: BluetoothService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
  ) {
    addIcons({
      arrowBackOutline, personOutline, cameraOutline, imageOutline,
      logOutOutline, moonOutline, notificationsOutline, volumeHighOutline,
      syncOutline, phonePortraitOutline, bluetoothOutline, wifiOutline,
      qrCodeOutline, shareSocialOutline, trashOutline, checkmarkOutline,
      closeOutline, createOutline, radioOutline, businessOutline,
      homeOutline, listOutline, newspaperOutline, mapOutline,
      timeOutline, alertCircleOutline, informationCircleOutline,
      scanOutline, chevronForwardOutline, cardOutline
    });
  }

  async ngOnInit() {
    this.usuario     = this.auth.getUser() || {};
    this.fotoPerfil  = await this.profile.getFotoPerfil();
    this.logoEmpresa = await this.profile.getLogoEmpresa();
    this.config      = await this.profile.getConfig();
    this.compartidos = await this.profile.getCompartidos();
    this.profile.aplicarTema(this.config.temaOscuro);
  }

  async ionViewWillEnter() {
    this.usuario     = this.auth.getUser() || {};
    this.fotoPerfil  = await this.profile.getFotoPerfil();
    this.logoEmpresa = await this.profile.getLogoEmpresa();
    this.config      = await this.profile.getConfig();
    this.compartidos = await this.profile.getCompartidos();
  }

  // ── FOTO DE PERFIL ────────────────────────────────
  async cambiarFoto() {
    const alert = await this.alertCtrl.create({
      header: 'Foto de perfil',
      buttons: [
        { text: 'Tomar foto', handler: () => this.tomarFoto() },
        { text: 'Elegir de galería', handler: () => this.elegirFoto() },
        ...(this.fotoPerfil ? [{ text: 'Eliminar', cssClass: 'fc-alert-danger', handler: () => this.eliminarFoto() }] : []),
        { text: 'Cancelar', role: 'cancel' }
      ],
      cssClass: 'fc-alert'
    });
    await alert.present();
  }

  async tomarFoto() {
    const foto = await this.camera.tomarDesdeCamara();
    await this.guardarFotoSeleccionada(foto);
  }

  async elegirFoto() {
    const foto = await this.camera.elegirDesdeGaleria();
    await this.guardarFotoSeleccionada(foto);
  }

  private async guardarFotoSeleccionada(foto: string | null) {
    if (foto) {
      await this.profile.saveFotoPerfil(foto);
      this.fotoPerfil = foto;
      this.mostrarToast('Foto de perfil actualizada', 'success');
    }
  }

  async eliminarFoto() {
    await this.profile.eliminarFotoPerfil();
    this.fotoPerfil = null;
    this.mostrarToast('Foto eliminada', 'success');
  }

  async cambiarLogoEmpresa() {
    const alert = await this.alertCtrl.create({
      header: 'Logo de facturas',
      message: 'Este logo aparecerá en los recibos y facturas.',
      buttons: [
        { text: this.logoEmpresa ? 'Cambiar logo' : 'Adjuntar logo', handler: () => this.elegirLogoEmpresa() },
        ...(this.logoEmpresa ? [{ text: 'Eliminar logo', cssClass: 'fc-alert-danger', handler: () => this.eliminarLogoEmpresa() }] : []),
        { text: 'Cancelar', role: 'cancel' }
      ],
      cssClass: 'fc-alert'
    });
    await alert.present();
  }

  async elegirLogoEmpresa() {
    const logo = await this.camera.elegirDesdeGaleria();
    if (!logo) return;
    await this.profile.saveLogoEmpresa(logo);
    this.logoEmpresa = logo;
    this.mostrarToast('Logo de facturas actualizado', 'success');
  }

  async eliminarLogoEmpresa() {
    await this.profile.eliminarLogoEmpresa();
    this.logoEmpresa = null;
    this.mostrarToast('Logo de facturas eliminado', 'success');
  }

  // ── EDITAR EMPRESA ────────────────────────────────
  abrirEditarEmpresa() {
    this.nombreEmpresaTemp = this.usuario.nombreEmpresa || '';
    this.editarNombreOpen = true;
  }
  cerrarEditarEmpresa() { this.editarNombreOpen = false; }
  async guardarNombreEmpresa() {
    if (!this.nombreEmpresaTemp.trim()) {
      return this.mostrarToast('El nombre no puede estar vacío', 'warning');
    }
    this.auth.actualizarNombreEmpresa(this.nombreEmpresaTemp.trim());
    this.usuario = this.auth.getUser();
    this.cerrarEditarEmpresa();
    this.mostrarToast('Empresa actualizada', 'success');
  }

  abrirEditarPerfil() {
    this.perfilForm = { ...this.usuario };
    this.editarPerfilOpen = true;
  }

  cerrarEditarPerfil() { this.editarPerfilOpen = false; }

  async guardarPerfil() {
    const actualizado = this.auth.actualizarPerfil(this.perfilForm);
    if (!actualizado) {
      return this.mostrarToast('No se pudo actualizar el perfil', 'danger');
    }
    this.usuario = actualizado;
    this.cerrarEditarPerfil();
    this.mostrarToast('Perfil actualizado', 'success');
  }

  // ── TOGGLES DE CONFIG ─────────────────────────────
  async toggleConfig(key: keyof AppConfig, event: any) {
    const value = event.detail.checked;
    (this.config as any)[key] = value;
    await this.profile.actualizarConfig({ [key]: value });
    if (key === 'temaOscuro') {
      this.mostrarToast(value ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'success');
    }
  }

  // ── NFC ───────────────────────────────────────────
  async setConfig(key: keyof AppConfig) {
    const value = !(this.config as any)[key];
    (this.config as any)[key] = value;
    await this.profile.actualizarConfig({ [key]: value });
    if (key === 'temaOscuro') {
      this.mostrarToast(value ? 'Modo oscuro activado' : 'Modo claro activado', 'success');
    }
  }

  async compartirPorNfc() {
    if (this.compartiendoNfc) return;
    if (!this.nfc.isSupported()) {
      this.mostrarToast(this.nfc.mensajeDisponibilidad(), 'warning');
      return;
    }
    this.compartiendoNfc = true;
    const load = await this.loadingCtrl.create({
      message: 'Acerca un tag NFC para escribir...',
      spinner: 'crescent',
    });
    await load.present();

    try {
      const contenido = `FLEXCREDI|TIPO:PERFIL|EMPRESA:${this.usuario.nombreEmpresa || 'FlexCredi'}|USUARIO:${this.usuario.nombre}|EMAIL:${this.usuario.email}`;
      const exito = await this.nfc.escribir(contenido);

      await this.profile.registrarCompartido({
        tipo: 'nfc',
        destino: 'Tag NFC',
        contenido: `Perfil NFC de ${this.usuario.nombre}`,
        exito
      });

      this.compartidos = await this.profile.getCompartidos();
      this.mostrarToast(
        exito ? 'Perfil compartido por NFC' : 'No se pudo compartir por NFC',
        exito ? 'success' : 'danger'
      );
    } catch (error) {
      console.error('[PerfilPage] Error NFC', error);
      this.mostrarToast('No se pudo completar NFC', 'danger');
    } finally {
      this.compartiendoNfc = false;
      await load.dismiss().catch(() => undefined);
    }
  }

  async leerNfc() {
    if (!this.nfc.isSupported()) {
      this.mostrarToast(this.nfc.mensajeDisponibilidad(), 'warning');
      return;
    }
    const load = await this.loadingCtrl.create({
      message: 'Acerca un tag NFC para leer...',
      spinner: 'crescent',
    });
    await load.present();
    try {
      const contenido = await this.nfc.leer();
      if (!contenido) {
        this.mostrarToast('No se pudo leer el tag NFC', 'warning');
        return;
      }
      await this.profile.registrarCompartido({
        tipo: 'nfc',
        destino: 'Tag NFC leído',
        contenido,
        exito: true
      });
      this.compartidos = await this.profile.getCompartidos();
      this.mostrarToast('Tag NFC leído correctamente', 'success');
    } finally {
      await load.dismiss().catch(() => undefined);
    }
  }

  // ── BLUETOOTH ─────────────────────────────────────
  async abrirBluetooth() {
    this.bleModalOpen = true;
    this.escanearBle();
  }
  cerrarBluetooth() { this.bleModalOpen = false; }

  async escanearBle() {
    this.escaneandoBle = true;
    this.dispositivosBle = [];
    const disp = await this.bluetooth.escanear();
    this.dispositivosBle = disp;
    this.escaneandoBle = false;
    if (disp.length === 0) {
      this.mostrarToast(this.bluetooth.mensajeDisponibilidad(), 'warning');
    }
  }

  async conectarBle(d: DispositivoBLE) {
    const load = await this.loadingCtrl.create({
      message: `Conectando con ${d.nombre}...`, spinner: 'crescent'
    });
    await load.present();
    const ok = await this.bluetooth.conectar(d.id);
    d.conectado = ok;

    await this.profile.registrarCompartido({
      tipo: 'bluetooth',
      destino: d.nombre,
      contenido: ok ? 'Conexión BLE real' : 'No se pudo conectar BLE',
      exito: ok
    });
    this.compartidos = await this.profile.getCompartidos();

    await load.dismiss();
    this.mostrarToast(ok ? `Conectado con ${d.nombre}` : `No se pudo conectar con ${d.nombre}`, ok ? 'success' : 'danger');
  }

  estadoNfc(): string {
    return this.nfc.mensajeDisponibilidad();
  }

  estadoBle(): string {
    return this.bluetooth.mensajeDisponibilidad();
  }

  // ── LIMPIAR HISTORIAL ─────────────────────────────
  async limpiarHistorial() {
    if (this.compartidos.length === 0) return;
    const alert = await this.alertCtrl.create({
      header: 'Limpiar historial',
      message: '¿Eliminar todo el historial de compartidos?',
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'fc-alert-cancel' },
        { text: 'Limpiar', cssClass: 'fc-alert-danger', handler: async () => {
          await this.profile.limpiarCompartidos();
          this.compartidos = [];
          this.mostrarToast('Historial limpiado', 'success');
        }}
      ]
    });
    await alert.present();
  }

  // ── LOGOUT ────────────────────────────────────────
  async logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // ── HELPERS ───────────────────────────────────────
  iconoCompartido(tipo: string): string {
    return tipo === 'nfc' ? 'radio-outline'
         : tipo === 'bluetooth' ? 'bluetooth-outline'
         : 'qr-code-outline';
  }
  colorCompartido(tipo: string): string {
    return tipo === 'nfc' ? '#dc2626'
         : tipo === 'bluetooth' ? '#3b82f6'
         : '#059669';
  }

  nivelSenal(rssi?: number): string {
    return this.bluetooth.nivelSenal(rssi);
  }

  ir(r: string) { this.router.navigate([r]); }

  private async mostrarToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({
      message: msg, duration: 2200, color, position: 'top', cssClass: 'fc-toast'
    });
    t.present();
  }
}
