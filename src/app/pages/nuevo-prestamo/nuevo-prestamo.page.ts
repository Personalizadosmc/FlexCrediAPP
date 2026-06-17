import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonInput, IonRippleEffect, IonModal,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, personOutline, cashOutline, calendarOutline,
  callOutline, checkmarkCircleOutline, calculatorOutline, personAddOutline,
  chevronForwardOutline, swapHorizontalOutline, closeOutline, searchOutline,
  checkmarkCircle, peopleOutline, cardOutline, closeCircle
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { Cliente, Prestamo } from '../../models';

@Component({
  selector: 'app-nuevo-prestamo',
  templateUrl: './nuevo-prestamo.page.html',
  styleUrls: ['./nuevo-prestamo.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    IonContent, IonIcon, IonInput, IonRippleEffect, IonModal
  ],
})
export class NuevoPrestamoPage implements OnInit {
  form!: FormGroup;
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  busquedaCliente = '';
  selectorOpen = false;

  frecuencia: 'semanal' | 'quincenal' | 'mensual' = 'semanal';
  resumen = { totalPagar: 0, cuotaMonto: 0, interesTotal: 0 };
  minDate = new Date().toISOString().split('T')[0];
  clienteSel: Cliente | null = null;
  clienteIni = '';

  constructor(
    private fb: FormBuilder,
    public data: DataService,
    private router: Router,
    private toast: ToastController,
    private loading: LoadingController
  ) {
    addIcons({
      arrowBackOutline, personOutline, cashOutline, calendarOutline,
      callOutline, checkmarkCircleOutline, calculatorOutline, personAddOutline,
      chevronForwardOutline, swapHorizontalOutline, closeOutline, searchOutline,
      checkmarkCircle, peopleOutline, cardOutline, closeCircle
    });
  }

  ngOnInit() {
    this.clientes = this.data.getClientes();
    this.clientesFiltrados = [...this.clientes];
    this.form = this.fb.group({
      monto:           new FormControl('',           [Validators.required, Validators.min(100)]),
      interes:         new FormControl(20,           [Validators.required, Validators.min(0)]),
      numeroCuotas:    new FormControl(10,           [Validators.required, Validators.min(1)]),
      fechaPrimerPago: new FormControl(this.minDate, Validators.required),
    });
    this.form.valueChanges.subscribe(() => this.calcular());
  }

  ionViewWillEnter() {
    this.clientes = this.data.getClientes();
    this.clientesFiltrados = [...this.clientes];
  }

  getCtrl(n: string): FormControl { return this.form.get(n) as FormControl; }

  // ─── MODAL SELECCIÓN ────────────────────────────
  abrirSelector() {
    this.busquedaCliente = '';
    this.clientesFiltrados = [...this.clientes];
    this.selectorOpen = true;
  }
  cerrarSelector() { this.selectorOpen = false; }
  cerrarSelectorYNuevoCliente() {
    this.selectorOpen = false;
    setTimeout(() => this.router.navigate(['/nuevo-cliente']), 250);
  }
  limpiarBusqueda() {
    this.busquedaCliente = '';
    this.filtrarClientes();
  }
  filtrarClientes() {
    const q = (this.busquedaCliente || '').toLowerCase().trim();
    if (!q) { this.clientesFiltrados = [...this.clientes]; return; }
    this.clientesFiltrados = this.clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.cedula || '').toLowerCase().includes(q) ||
      (c.telefono || '').toLowerCase().includes(q)
    );
  }
  seleccionarCliente(c: Cliente) {
    this.clienteSel = c;
    this.clienteIni = this.data.getIniciales(c.nombre);
    setTimeout(() => this.cerrarSelector(), 180);
  }

  // ─── CÁLCULOS ───────────────────────────────────
  calcular() {
    const { monto, interes, numeroCuotas } = this.form.value;
    if (+monto > 0 && +interes >= 0 && +numeroCuotas > 0) {
      const interesTotal = +monto * +interes / 100;
      const totalPagar = +monto + interesTotal;
      this.resumen = { totalPagar, interesTotal, cuotaMonto: +(totalPagar / +numeroCuotas).toFixed(2) };
    } else {
      this.resumen = { totalPagar: 0, cuotaMonto: 0, interesTotal: 0 };
    }
  }

  setFrecuencia(f: 'semanal' | 'quincenal' | 'mensual') { this.frecuencia = f; }

  // ─── CONFIRMAR ──────────────────────────────────
  async confirmar() {
    if (!this.clienteSel) {
      const t = await this.toast.create({
        message: 'Selecciona un cliente primero',
        duration: 2200, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      });
      return t.present();
    }
    if (this.form.invalid) {
      const t = await this.toast.create({
        message: 'Completa todos los campos requeridos',
        duration: 2200, color: 'warning', position: 'top',
        cssClass: 'fc-toast'
      });
      return t.present();
    }

    const load = await this.loading.create({ message: 'Creando préstamo...', spinner: 'crescent' });
    await load.present();

    const { monto, interes, numeroCuotas, fechaPrimerPago } = this.form.value;
    const cuotas = this.data.calcularCuotas(+monto, +interes, +numeroCuotas, this.frecuencia, fechaPrimerPago);
    const p: Prestamo = {
      id: this.data.generarId('PRS'),
      clienteId: this.clienteSel.id,
      clienteNombre: this.clienteSel.nombre,
      clienteTelefono: this.clienteSel.telefono,
      monto: +monto, interes: +interes, frecuencia: this.frecuencia,
      numeroCuotas: +numeroCuotas, cuotaMonto: this.resumen.cuotaMonto,
      totalPagar: this.resumen.totalPagar,
      fechaInicio: new Date().toISOString(),
      fechaPrimerPago: fechaPrimerPago,
      estado: 'activo', cuotas,
    };
    this.data.agregarPrestamo(p);
    await load.dismiss();

    const t = await this.toast.create({
      message: 'Préstamo creado exitosamente',
      duration: 2500, color: 'success', position: 'top',
      cssClass: 'fc-toast'
    });
    await t.present();
    this.router.navigateByUrl('/dashboard');
  }

  goNuevoCliente() { this.router.navigate(['/nuevo-cliente']); }
  goBack() { this.router.navigate(['/dashboard']); }
}
