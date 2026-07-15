import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonRippleEffect } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, trendingUpOutline, peopleOutline, warningOutline, checkmarkCircleOutline, timeOutline, cardOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { Pago, Prestamo } from '../../models';

type PeriodoReporte = 'semana' | 'mes' | 'ano';
type FrecuenciaPago = Prestamo['frecuencia'];

interface BarraReporte {
  lbl: string;
  total: number;
  semanal: number;
  quincenal: number;
  mensual: number;
  hSemanal: number;
  hQuincenal: number;
  hMensual: number;
}

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonRippleEffect],
})
export class ReportesPage implements OnInit {
  stats: ReturnType<DataService['getStats']> = {} as ReturnType<DataService['getStats']>;
  pagos: Pago[] = [];
  pagosPeriodo: Pago[] = [];
  periodo: PeriodoReporte = 'semana';
  cobradoPeriodo = 0;
  barras: BarraReporte[] = [];
  tituloGrafica = 'Cobros diarios de esta semana';

  constructor(public data: DataService, private router: Router) {
    addIcons({ arrowBackOutline, trendingUpOutline, peopleOutline, warningOutline, checkmarkCircleOutline, timeOutline, cardOutline });
  }

  ngOnInit() { this.cargar(); }
  ionViewWillEnter() { this.data.actualizarEstadosPrestamos(); this.cargar(); }

  cargar() {
    this.stats = this.data.getStats();
    this.pagos = this.data.getPagos();
    this.actualizarReporte();
  }

  setPeriodo(periodo: PeriodoReporte) {
    if (this.periodo === periodo) return;
    this.periodo = periodo;
    this.actualizarReporte();
  }

  private actualizarReporte() {
    const { desde, hasta } = this.obtenerRango();
    this.pagosPeriodo = this.pagos
      .filter(p => {
        const fecha = new Date(p.fecha);
        return fecha >= desde && fecha < hasta;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.cobradoPeriodo = this.pagosPeriodo.reduce((total, pago) => total + pago.monto, 0);
    this.calcularBarras(desde);
  }

  private obtenerRango(): { desde: Date; hasta: Date } {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy);
    hasta.setDate(hasta.getDate() + 1);

    if (this.periodo === 'semana') {
      const desde = new Date(hoy);
      desde.setDate(desde.getDate() - 6);
      return { desde, hasta };
    }
    if (this.periodo === 'mes') {
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
        hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1),
      };
    }
    return {
      desde: new Date(hoy.getFullYear(), 0, 1),
      hasta: new Date(hoy.getFullYear() + 1, 0, 1),
    };
  }

  private calcularBarras(desde: Date) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const cantidad = this.periodo === 'semana' ? 7 : this.periodo === 'mes' ? 5 : 12;

    this.tituloGrafica = this.periodo === 'semana'
      ? 'Cobros diarios de esta semana'
      : this.periodo === 'mes'
        ? 'Cobros por semana de este mes'
        : 'Cobros mensuales de este año';

    const barras: BarraReporte[] = Array.from({ length: cantidad }, (_, indice) => ({
      lbl: this.periodo === 'semana'
        ? dias[new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + indice).getDay()]
        : this.periodo === 'mes' ? `S${indice + 1}` : meses[indice],
      total: 0,
      semanal: 0,
      quincenal: 0,
      mensual: 0,
      hSemanal: 0,
      hQuincenal: 0,
      hMensual: 0,
    }));

    const frecuenciaPorPrestamo = new Map(
      this.data.getPrestamos().map(prestamo => [prestamo.id, prestamo.frecuencia] as const)
    );

    for (const pago of this.pagosPeriodo) {
      const fecha = new Date(pago.fecha);
      const indice = this.obtenerIndiceBarra(fecha, desde);
      const frecuencia: FrecuenciaPago = frecuenciaPorPrestamo.get(pago.prestamoId) || 'semanal';
      const barra = barras[indice];
      if (!barra) continue;
      barra[frecuencia] += pago.monto;
      barra.total += pago.monto;
    }

    const maximo = Math.max(...barras.map(barra => barra.total), 1);
    const alturaMaxima = 92;
    for (const barra of barras) {
      barra.hSemanal = Math.round((barra.semanal / maximo) * alturaMaxima);
      barra.hQuincenal = Math.round((barra.quincenal / maximo) * alturaMaxima);
      barra.hMensual = Math.round((barra.mensual / maximo) * alturaMaxima);
    }
    this.barras = barras;
  }

  private obtenerIndiceBarra(fecha: Date, desde: Date): number {
    if (this.periodo === 'semana') {
      const fechaLocal = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      return Math.floor((fechaLocal.getTime() - desde.getTime()) / 86_400_000);
    }
    if (this.periodo === 'mes') return Math.floor((fecha.getDate() - 1) / 7);
    return fecha.getMonth();
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
