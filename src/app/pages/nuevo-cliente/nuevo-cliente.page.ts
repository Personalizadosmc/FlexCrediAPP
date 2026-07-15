import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect, ToastController, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline, mailOutline, cameraOutline, imageOutline, trashOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { CameraService } from '../../services/camera.service';
import { Cliente } from '../../models';

@Component({
  selector: 'app-nuevo-cliente',
  templateUrl: './nuevo-cliente.page.html',
  styleUrls: ['./nuevo-cliente.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, IonRippleEffect],
})
export class NuevoClientePage implements OnInit {
  nombre = ''; cedula = ''; telefono = ''; email = ''; direccion = '';
  fotoDocumento: string | null = null;
  editandoId: string | null = null;
  titulo = 'Nuevo Cliente';
  subtitulo = 'Registra los datos del cliente';

  constructor(private data: DataService, private camera: CameraService, private router: Router, private route: ActivatedRoute,
    private toast: ToastController, private loading: LoadingController) {
    addIcons({ arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline, mailOutline, cameraOutline, imageOutline, trashOutline });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.cargarFormulario(params.get('id'));
    });
  }

  private cargarFormulario(id: string | null) {
    this.editandoId = id;
    if (!this.editandoId) {
      this.titulo = 'Nuevo Cliente';
      this.subtitulo = 'Registra los datos del cliente';
      this.nombre = '';
      this.cedula = '';
      this.telefono = '';
      this.email = '';
      this.direccion = '';
      this.fotoDocumento = null;
      return;
    }

    const cliente = this.data.getClienteById(this.editandoId);
    if (!cliente) {
      this.toast.create({
        message: 'Cliente no encontrado',
        duration: 2200, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      }).then(t => t.present());
      this.router.navigateByUrl('/clientes');
      return;
    }

    this.titulo = 'Editar Cliente';
    this.subtitulo = 'Actualiza los datos del cliente';
    this.nombre = cliente.nombre || '';
    this.cedula = cliente.cedula || '';
    this.telefono = cliente.telefono || '';
    this.email = cliente.email || '';
    this.direccion = cliente.direccion || '';
    this.fotoDocumento = cliente.fotoComprobante || null;
  }

  goBack() { this.router.navigate(['/clientes']); }

  async guardar() {
    if (!this.nombre.trim() || !this.cedula.trim() || !this.telefono.trim()) {
      const t = await this.toast.create({
        message: 'Nombre, cédula y teléfono son obligatorios',
        duration: 2500, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      });
      return t.present();
    }

    // Validar email si se proporcionó
    if (this.email.trim() && !this.email.includes('@')) {
      const t = await this.toast.create({
        message: 'El correo electrónico no es válido',
        duration: 2500, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      });
      return t.present();
    }

    const load = await this.loading.create({ message: this.editandoId ? 'Actualizando cliente...' : 'Guardando cliente...', spinner: 'crescent' });
    await load.present();
    const clienteExistente = this.editandoId ? this.data.getClienteById(this.editandoId) : undefined;
    const c: Cliente = {
      ...clienteExistente,
      id: this.editandoId || this.data.generarId('CLI'),
      nombre: this.nombre.trim(), cedula: this.cedula.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim().toLowerCase(),
      direccion: this.direccion.trim(),
      fotoComprobante: this.fotoDocumento || undefined,
      fechaRegistro: clienteExistente?.fechaRegistro || new Date().toISOString(),
    };
    if (this.editandoId) this.data.actualizarCliente(c);
    else this.data.agregarCliente(c);
    await load.dismiss();
    const t = await this.toast.create({
      message: this.editandoId ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente',
      duration: 2200, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    await t.present();
    this.router.navigateByUrl('/clientes');
  }

  async tomarFotoDocumento() {
    const foto = await this.camera.tomarDesdeCamara();
    if (foto) this.guardarFotoDocumento(foto);
  }

  async elegirFotoDocumento() {
    const foto = await this.camera.elegirDesdeGaleria();
    if (foto) this.guardarFotoDocumento(foto);
  }

  eliminarFotoDocumento() {
    this.fotoDocumento = null;
  }

  private async guardarFotoDocumento(foto: string) {
    this.fotoDocumento = foto;
    const t = await this.toast.create({
      message: 'Foto de documento adjuntada',
      duration: 1800, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }
}
