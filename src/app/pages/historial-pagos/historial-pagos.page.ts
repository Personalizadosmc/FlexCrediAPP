import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, searchOutline, receiptOutline, personOutline,
  cashOutline, calendarOutline, cardOutline, peopleOutline,
  homeOutline, listOutline, newspaperOutline, mapOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { Cliente, Pago, Prestamo } from '../../models';

type VistaHistorial = 'general' | 'cliente';

@Component({
  selector: 'app-historial-pagos',
  templateUrl: './historial-pagos.page.html',
  styleUrls: ['./historial-pagos.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, IonContent, IonIcon, IonInput, IonRippleEffect],
})
export class HistorialPagosPage implements OnInit {
  pagos: Pago[] = [];
  clientes: Cliente[] = [];
  prestamos: Prestamo[] = [];
  vista: VistaHistorial = 'general';
  busqueda = '';
  clienteId = '';

  constructor(public data: DataService, private router: Router, private route: ActivatedRoute) {
    addIcons({
      arrowBackOutline, searchOutline, receiptOutline, personOutline,
      cashOutline, calendarOutline, cardOutline, peopleOutline,
      homeOutline, listOutline, newspaperOutline, mapOutline
    });
  }

  ngOnInit() {
    this.clienteId = this.route.snapshot.queryParamMap.get('clienteId') || '';
    this.vista = this.clienteId ? 'cliente' : 'general';
    this.cargar();
  }
  ionViewWillEnter() { this.cargar(); }

  cargar() {
    this.pagos = this.data.getPagos().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.clientes = this.data.getClientes().sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.prestamos = this.data.getPrestamos();
  }

  setVista(vista: VistaHistorial) {
    this.vista = vista;
    this.busqueda = '';
  }

  seleccionarCliente(id: string) {
    this.clienteId = id;
    this.vista = 'cliente';
  }

  get pagosFiltrados(): Pago[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.pagos.filter(p => {
      const coincideCliente = this.vista === 'general' || !this.clienteId || p.clienteId === this.clienteId;
      const coincideTexto = !q ||
        p.clienteNombre.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.prestamoId.toLowerCase().includes(q);
      return coincideCliente && coincideTexto;
    });
  }

  get totalGeneral(): number {
    return this.pagos.reduce((s, p) => s + p.monto, 0);
  }

  get totalFiltrado(): number {
    return this.pagosFiltrados.reduce((s, p) => s + p.monto, 0);
  }

  get clienteSeleccionado(): Cliente | undefined {
    return this.clientes.find(c => c.id === this.clienteId);
  }

  pagosDeCliente(id: string): Pago[] {
    return this.pagos.filter(p => p.clienteId === id);
  }

  totalCliente(id: string): number {
    return this.pagosDeCliente(id).reduce((s, p) => s + p.monto, 0);
  }

  ultimoPagoCliente(id: string): string {
    const pago = this.pagosDeCliente(id)[0];
    return pago?.fecha || '';
  }

  prestamoDe(pago: Pago): Prestamo | undefined {
    return this.prestamos.find(p => p.id === pago.prestamoId);
  }

  ir(r: string) { this.router.navigateByUrl(r); }
}
