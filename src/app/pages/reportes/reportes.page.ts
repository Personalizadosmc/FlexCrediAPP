import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonRippleEffect } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, trendingUpOutline, cashOutline, peopleOutline, warningOutline, checkmarkCircleOutline, timeOutline, cardOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { Pago } from '../../models';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, IonRippleEffect],
})
export class ReportesPage implements OnInit {
  stats: any = {};
  pagos: Pago[] = [];
  periodo: 'semana' | 'mes' | 'ano' = 'semana';
  cobradoPeriodo = 0;
  barras: { lbl: string; h: number; gold: boolean }[] = [];

  constructor(public data: DataService, private router: Router) {
    addIcons({ arrowBackOutline, trendingUpOutline, cashOutline, peopleOutline, warningOutline, checkmarkCircleOutline, timeOutline, cardOutline });
  }

  ngOnInit() { this.cargar(); }
  ionViewWillEnter() { this.data.actualizarEstadosPrestamos(); this.cargar(); }

  cargar() {
    this.stats = this.data.getStats();
    this.pagos = this.data.getPagos();
    this.calcularPeriodo();
    this.calcularBarras();
  }

  setPeriodo(p: 'semana' | 'mes' | 'ano') { this.periodo = p; this.calcularPeriodo(); this.calcularBarras(); }

  calcularPeriodo() {
    const ahora = new Date();
    let desde: Date;
    if (this.periodo === 'semana') { desde = new Date(ahora); desde.setDate(desde.getDate() - 7); }
    else if (this.periodo === 'mes') { desde = new Date(ahora); desde.setMonth(desde.getMonth() - 1); }
    else { desde = new Date(ahora); desde.setFullYear(desde.getFullYear() - 1); }
    this.cobradoPeriodo = this.pagos.filter(p => new Date(p.fecha) >= desde).reduce((s, p) => s + p.monto, 0);
  }

  calcularBarras() {
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const hoy = new Date().getDay();
    const max = 70;
    const semana: { [k: string]: number } = {};
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 6);
    this.pagos.filter(p => new Date(p.fecha) >= hace7).forEach(p => {
      const d = dias[new Date(p.fecha).getDay()];
      semana[d] = (semana[d] || 0) + p.monto;
    });
    const maxVal = Math.max(...Object.values(semana), 1);
    this.barras = Array.from({ length: 7 }, (_, i) => {
      const di = (hoy - 6 + i + 7) % 7;
      const lbl = dias[di];
      const val = semana[lbl] || 0;
      return { lbl, h: Math.round((val / maxVal) * max) || 4, gold: di === hoy };
    });
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
