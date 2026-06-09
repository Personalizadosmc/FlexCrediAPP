import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonInput, IonRippleEffect, IonModal, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, personOutline, cashOutline, calendarOutline, callOutline, checkmarkCircleOutline, calculatorOutline, searchOutline, checkmarkOutline, peopleOutline, personAddOutline, chevronForwardOutline, swapHorizontalOutline, closeOutline, closeCircle } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { Cliente, Prestamo } from '../../models';

@Component({
  selector: 'app-nuevo-prestamo',
  templateUrl: './nuevo-prestamo.page.html',
  styleUrls: ['./nuevo-prestamo.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonContent, IonIcon, IonInput, IonRippleEffect, IonModal],
})
export class NuevoPrestamoPage implements OnInit {
  form!: FormGroup;
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  busquedaCliente = '';
  frecuencia: 'semanal' | 'quincenal' | 'mensual' = 'semanal';
  resumen = { totalPagar: 0, cuotaMonto: 0, interesTotal: 0 };
  minDate = new Date().toISOString().split('T')[0];
  clienteSel: Cliente | null = null;
  clienteSelId = '';
  clienteIni = '';
  selectorOpen = false;

  constructor(
    private fb: FormBuilder,
    public data: DataService,
    private router: Router,
    private toastSvc: ToastService,
    private loading: LoadingController
  ) {
    addIcons({ arrowBackOutline, personOutline, cashOutline, calendarOutline, callOutline, checkmarkCircleOutline, calculatorOutline, searchOutline, checkmarkOutline, peopleOutline, personAddOutline, chevronForwardOutline, swapHorizontalOutline, closeOutline, closeCircle });
  }

  ngOnInit() {
    this.clientes = this.data.getClientes();
    this.clientesFiltrados = [...this.clientes];
    this.form = this.fb.group({
      monto:           new FormControl('', [Validators.required, Validators.min(100)]),
      interes:         new FormControl(20, [Validators.required, Validators.min(0)]),
      numeroCuotas:    new FormControl(10, [Validators.required, Validators.min(1)]),
      fechaPrimerPago: new FormControl(this.minDate, Validators.required),
    });
    this.form.valueChanges.subscribe(() => this.calcular());
  }

  ionViewWillEnter() {
    this.clientes = this.data.getClientes();
    this.clientesFiltrados = [...this.clientes];
  }

  abrirSelector()    { this.selectorOpen = true; }
  cerrarSelector()   { this.selectorOpen = false; this.busquedaCliente = ''; this.clientesFiltrados = [...this.clientes]; }
  limpiarBusqueda()  { this.busquedaCliente = ''; this.clientesFiltrados = [...this.clientes]; }

  cerrarSelectorYNuevoCliente() { this.cerrarSelector(); this.router.navigate(['/nuevo-cliente']); }

  filtrarClientes() {
    const q = this.busquedaCliente.toLowerCase();
    this.clientesFiltrados = q
      ? this.clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q) || c.cedula?.includes(q))
      : [...this.clientes];
  }

  seleccionarCliente(c: Cliente) {
    this.clienteSel = c;
    this.clienteSelId = c.id;
    this.clienteIni = this.data.getIniciales(c.nombre);
    this.cerrarSelector();
  }

  getCtrl(n: string): FormControl { return this.form.get(n) as FormControl; }

  calcular() {
    const { monto, interes, numeroCuotas } = this.form.value;
    if (+monto > 0 && +interes >= 0 && +numeroCuotas > 0) {
      const interesTotal = +monto * +interes / 100;
      const totalPagar   = +monto + interesTotal;
      this.resumen = { totalPagar, interesTotal, cuotaMonto: +(totalPagar / +numeroCuotas).toFixed(2) };
    } else {
      this.resumen = { totalPagar: 0, cuotaMonto: 0, interesTotal: 0 };
    }
  }

  setFrecuencia(f: 'semanal' | 'quincenal' | 'mensual') { this.frecuencia = f; }

  async confirmar() {
    if (!this.clienteSel)
      return this.toastSvc.warning('Selecciona un cliente de la lista');
    if (this.form.invalid)
      return this.toastSvc.warning('Completa todos los campos requeridos');

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
      fechaInicio: new Date().toISOString(), fechaPrimerPago,
      estado: 'activo', cuotas,
    };
    this.data.agregarPrestamo(p);
    await load.dismiss();
    await this.toastSvc.success(`Préstamo de ${this.data.formatMoney(+monto)} creado para ${this.clienteSel.nombre}`);
    this.router.navigateByUrl('/dashboard');
  }

  goNuevoCliente() { this.router.navigate(['/nuevo-cliente']); }
  goBack()         { this.router.navigate(['/dashboard']); }
}
