import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { Cliente } from '../../models';

@Component({
  selector: 'app-nuevo-cliente',
  templateUrl: './nuevo-cliente.page.html',
  styleUrls: ['./nuevo-cliente.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, IonRippleEffect],
})
export class NuevoClientePage {
  nombre = ''; cedula = ''; telefono = ''; direccion = '';

  constructor(
    private data: DataService,
    private router: Router,
    private toastSvc: ToastService,
    private loading: LoadingController
  ) {
    addIcons({ arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline });
  }

  goBack() { this.router.navigate(['/clientes']); }

  async guardar() {
    if (!this.nombre.trim() || !this.cedula.trim() || !this.telefono.trim())
      return this.toastSvc.warning('Nombre, cédula y teléfono son obligatorios');

    const load = await this.loading.create({ message: 'Guardando cliente...', spinner: 'crescent' });
    await load.present();
    const c: Cliente = {
      id: this.data.generarId('CLI'),
      nombre: this.nombre.trim(), cedula: this.cedula.trim(),
      telefono: this.telefono.trim(), direccion: this.direccion.trim(),
      fechaRegistro: new Date().toISOString(),
    };
    this.data.agregarCliente(c);
    await load.dismiss();
    await this.toastSvc.success(`Cliente "${c.nombre}" registrado correctamente`);
    this.router.navigateByUrl('/clientes');
  }
}
