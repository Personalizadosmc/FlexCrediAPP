import { Injectable } from '@angular/core';
import { Cliente, Prestamo, Cuota, Pago } from '../models';

@Injectable({ providedIn: 'root' })
export class DataService {

  // ── CLIENTES ──────────────────────────────────────────
  getClientes(): Cliente[] {
    const d = localStorage.getItem('fc_clientes');
    return d ? JSON.parse(d) : [];
  }
  saveClientes(lista: Cliente[]) {
    localStorage.setItem('fc_clientes', JSON.stringify(lista));
  }
  agregarCliente(c: Cliente) {
    const l = this.getClientes(); l.push(c);
    this.saveClientes(l);
  }
  actualizarCliente(c: Cliente) {
    const l = this.getClientes();
    const i = l.findIndex(x => x.id === c.id);
    if (i >= 0) {
      l[i] = c;
      this.saveClientes(l);

      const prestamos = this.getPrestamos();
      let actualizados = false;
      prestamos.forEach(p => {
        if (p.clienteId !== c.id) return;
        p.clienteNombre = c.nombre;
        p.clienteTelefono = c.telefono;
        p.clienteEmail = c.email || '';
        actualizados = true;
      });
      if (actualizados) this.savePrestamos(prestamos);
    }
  }
  eliminarCliente(id: string) {
    this.saveClientes(this.getClientes().filter(c => c.id !== id));
  }
  getClienteById(id: string) { return this.getClientes().find(c => c.id === id); }

  // ── PRÉSTAMOS ─────────────────────────────────────────
  getPrestamos(): Prestamo[] {
    const d = localStorage.getItem('fc_prestamos');
    return d ? JSON.parse(d) : [];
  }
  savePrestamos(lista: Prestamo[]) {
    localStorage.setItem('fc_prestamos', JSON.stringify(lista));
  }
  agregarPrestamo(p: Prestamo) {
    const l = this.getPrestamos(); l.push(p);
    this.savePrestamos(l);
  }
  actualizarPrestamo(p: Prestamo) {
    const l = this.getPrestamos();
    const i = l.findIndex(x => x.id === p.id);
    if (i >= 0) { l[i] = p; this.savePrestamos(l); }
  }
  getPrestamosActivos(): Prestamo[] {
    return this.getPrestamos().filter(p => p.estado !== 'completado');
  }
  getPrestamosByCliente(clienteId: string): Prestamo[] {
    return this.getPrestamos().filter(p => p.clienteId === clienteId);
  }
  getPrestamoById(id: string): Prestamo | undefined {
    return this.getPrestamos().find(p => p.id === id);
  }
  actualizarEstadosPrestamos() {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const lista = this.getPrestamos().map(p => {
      if (p.estado === 'completado') return p;
      const tieneAtrasada = p.cuotas.some(c => {
        if (c.estado !== 'pendiente') return false;
        const f = new Date(c.fechaVencimiento); f.setHours(0,0,0,0);
        return f < hoy;
      });
      p.estado = tieneAtrasada ? 'atrasado' : 'activo';
      return p;
    });
    this.savePrestamos(lista);
  }

  // ── PAGOS ─────────────────────────────────────────────
  getPagos(): Pago[] {
    const d = localStorage.getItem('fc_pagos');
    return d ? JSON.parse(d) : [];
  }
  savePagos(lista: Pago[]) {
    localStorage.setItem('fc_pagos', JSON.stringify(lista));
  }
  registrarPago(pago: Pago) {
    const pagos = this.getPagos(); pagos.unshift(pago);
    this.savePagos(pagos);
    const p = this.getPrestamoById(pago.prestamoId);
    if (p) {
      const c = p.cuotas.find(x => x.numero === pago.cuotaNumero);
      if (c) { c.estado = 'pagada'; c.fechaPago = pago.fecha; }
      const todas = p.cuotas.every(x => x.estado === 'pagada');
      if (todas) p.estado = 'completado';
      this.actualizarPrestamo(p);
    }
  }
  actualizarPago(pago: Pago) {
    const pagos = this.getPagos();
    const idx = pagos.findIndex(p => p.id === pago.id);
    if (idx >= 0) {
      pagos[idx] = pago;
      this.savePagos(pagos);
    }
  }
  eliminarPago(id: string) {
    this.savePagos(this.getPagos().filter(p => p.id !== id));
  }

  // ── CALCULAR CUOTAS ───────────────────────────────────
  calcularCuotas(monto: number, interes: number, nc: number,
    freq: 'semanal'|'quincenal'|'mensual', fechaPrimerPago: string): Cuota[] {
    const total = monto + monto * interes / 100;
    const cm = +(total / nc).toFixed(2);
    const dias: Record<string,number> = { semanal:7, quincenal:15, mensual:30 };
    const d = dias[freq];
    return Array.from({ length: nc }, (_, i) => {
      const f = new Date(fechaPrimerPago + 'T00:00:00');
      f.setDate(f.getDate() + d * i);
      return { numero: i+1, fechaVencimiento: f.toISOString().split('T')[0], monto: cm, estado: 'pendiente' as const };
    });
  }

  // ── STATS ─────────────────────────────────────────────
  getStats() {
    const ps = this.getPrestamos();
    const hoy = new Date().toISOString().split('T')[0];
    const cobrosHoy = ps.reduce((s, p) => s + p.cuotas.filter(c =>
      c.fechaVencimiento === hoy && c.estado === 'pendiente'
    ).reduce((x, c) => x + c.monto, 0), 0);
    const totalPorFreq = (f: string) => ps.filter(p => p.frecuencia === f && p.estado !== 'completado').reduce((s,p)=>s+p.monto,0);
    return {
      totalCartera: ps.filter(p=>p.estado!=='completado').reduce((s,p)=>s+p.monto,0),
      cobrosHoy,
      totalClientes: this.getClientes().length,
      atrasados: ps.filter(p=>p.estado==='atrasado').length,
      activos: ps.filter(p=>p.estado==='activo').length,
      completados: ps.filter(p=>p.estado==='completado').length,
      semanal: totalPorFreq('semanal'),
      quincenal: totalPorFreq('quincenal'),
      mensual: totalPorFreq('mensual'),
    };
  }

  // ── UTILIDADES ────────────────────────────────────────
  generarId(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(Math.random()*999)}`; }
  getIniciales(nombre: string) { return nombre.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase(); }
  getAvatarColor(nombre: string) {
    const c=['#1a56db','#7c3aed','#065f46','#b45309','#be123c','#0369a1','#0f766e','#9333ea'];
    return c[nombre.charCodeAt(0) % c.length];
  }
  formatMoney(n: number) { return 'RD$ ' + n.toLocaleString('es-DO', {minimumFractionDigits:0,maximumFractionDigits:0}); }
}
