import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect, ToastController, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
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

  constructor(private data: DataService, private router: Router,
    private toast: ToastController, private loading: LoadingController) {
    addIcons({ arrowBackOutline, personOutline, cardOutline, callOutline, locationOutline, checkmarkCircleOutline });
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
    const t = await this.toast.create({
      message: 'Cliente registrado correctamente',
      duration: 2200, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    await t.present();
    this.router.navigateByUrl('/clientes');
  }
}
