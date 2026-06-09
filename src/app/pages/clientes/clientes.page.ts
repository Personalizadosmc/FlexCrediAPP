import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, addOutline, arrowBackOutline, callOutline, trashOutline, createOutline, personOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { Cliente } from '../../models';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonInput, IonRippleEffect],
})
export class ClientesPage implements OnInit {
  clientes: Cliente[] = [];
  filtrados: Cliente[] = [];
  busqueda = '';

  constructor(public data: DataService, private router: Router,
    private alert: AlertController, private toast: ToastController) {
    addIcons({ searchOutline, addOutline, arrowBackOutline, callOutline, trashOutline, createOutline, personOutline });
  }

  ngOnInit() { this.cargar(); }
  ionViewWillEnter() { this.cargar(); }

  cargar() { this.clientes = this.data.getClientes(); this.filtrar(); }
  filtrar() {
    const q = this.busqueda.toLowerCase();
    this.filtrados = q ? this.clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) || c.cedula.includes(q) || c.telefono.includes(q)
    ) : this.clientes;
  }

  getPrestamosCount(id: string) { return this.data.getPrestamosByCliente(id).length; }
  getTotalPrestado(id: string) { return this.data.getPrestamosByCliente(id).filter(p=>p.estado!=='completado').reduce((s,p)=>s+p.monto,0); }

  async eliminar(c: Cliente) {
    // FIX: usar texto plano (Ionic sanitiza <strong>/<br> por seguridad)
    const al = await this.alert.create({
      header: 'Eliminar Cliente',
      subHeader: c.nombre,
      message: '¿Estás seguro de eliminar este cliente?\n\nEsta acción no se puede deshacer y se perderán todos sus datos.',
      cssClass: 'fc-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'fc-alert-cancel' },
        { text: 'Eliminar', cssClass: 'fc-alert-danger', handler: () => {
          this.data.eliminarCliente(c.id);
          this.cargar();
          this.toast.create({
            message: 'Cliente eliminado correctamente',
            duration: 2000, color: 'medium', position: 'top',
            cssClass: 'fc-toast',
            buttons: [{ icon: 'close', role: 'cancel' }]
          }).then(t => t.present());
        }}
      ]
    });
    al.present();
  }

  ir(r:string){this.router.navigate([r])}
}
