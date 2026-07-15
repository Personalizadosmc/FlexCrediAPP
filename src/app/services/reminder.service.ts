import { Injectable } from '@angular/core';
import { Prestamo, Cuota } from '../models';
import { DataService } from './data.service';

export interface Recordatorio {
  prestamoId: string;
  clienteNombre: string;
  clienteTelefono: string;
  cuota: Cuota;
  monto: number;
  numeroCuotas: number;
  tipo: 'previo' | 'hoy';   // 'previo' = 1 día antes, 'hoy' = el mismo día
  fechaVenc: string;
  yaEnviado: boolean;       // si ya se mandó hoy
}

/**
 * Servicio que detecta cuotas que necesitan recordatorio.
 * Estrategia:
 *   - cada cuota pendiente vencida MAÑANA → recordatorio "previo"
 *   - cada cuota pendiente vencida HOY    → recordatorio "hoy"
 *
 * Lleva un registro local (localStorage) de qué recordatorios ya
 * se enviaron HOY para no duplicar avisos en la misma fecha.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {

  private SENT_KEY = 'fc_recordatorios_enviados';

  constructor(private data: DataService) {}

  /**
   * Devuelve la lista de recordatorios pendientes (mañana + hoy).
   * NO incluye los ya enviados hoy.
   */
  getRecordatoriosPendientes(): Recordatorio[] {
    const todos = this.calcularTodosRecordatorios();
    return todos.filter(r => !r.yaEnviado);
  }

  /**
   * Devuelve TODOS los recordatorios (enviados + pendientes) para mostrarlos
   * agrupados en la UI.
   */
  getTodosRecordatorios(): Recordatorio[] {
    return this.calcularTodosRecordatorios();
  }

  /**
   * Marca un recordatorio como enviado (se persiste en localStorage).
   */
  marcarEnviado(prestamoId: string, cuotaNumero: number, tipo: 'previo' | 'hoy') {
    const enviados = this.getEnviados();
    const key = this.makeKey(prestamoId, cuotaNumero, tipo);
    enviados[key] = this.fechaSoloDia(new Date());
    localStorage.setItem(this.SENT_KEY, JSON.stringify(enviados));
  }

  /**
   * Cuenta total de recordatorios pendientes (para mostrar badge).
   */
  contarPendientes(): number {
    return this.getRecordatoriosPendientes().length;
  }

  // ──────────────────────────────────────────────────────

  private calcularTodosRecordatorios(): Recordatorio[] {
    const enviados = this.getEnviados();
    const hoy = this.fechaSoloDia(new Date());
    const manana = this.fechaSoloDia(this.addDays(new Date(), 1));

    const lista: Recordatorio[] = [];
    const prestamos: Prestamo[] = this.data.getPrestamos()
      .filter(p => p.estado !== 'completado');

    for (const p of prestamos) {
      for (const cuota of p.cuotas) {
        if (cuota.estado !== 'pendiente' && cuota.estado !== 'atrasada') continue;
        const fechaCuota = this.fechaSoloDia(new Date(cuota.fechaVencimiento + 'T00:00:00'));
        let tipo: 'previo' | 'hoy' | null = null;
        if (fechaCuota === manana) tipo = 'previo';
        else if (fechaCuota === hoy) tipo = 'hoy';
        if (!tipo) continue;

        const key = this.makeKey(p.id, cuota.numero, tipo);
        const yaEnviado = enviados[key] === hoy;

        lista.push({
          prestamoId: p.id,
          clienteNombre: p.clienteNombre,
          clienteTelefono: p.clienteTelefono,
          cuota,
          monto: cuota.monto,
          numeroCuotas: p.numeroCuotas,
          tipo,
          fechaVenc: cuota.fechaVencimiento,
          yaEnviado,
        });
      }
    }

    // Orden: primero los de HOY, luego los previos
    lista.sort((a, b) => {
      if (a.tipo === b.tipo) return a.clienteNombre.localeCompare(b.clienteNombre);
      return a.tipo === 'hoy' ? -1 : 1;
    });

    return lista;
  }

  /** Obtiene el préstamo completo a partir del recordatorio. */
  getPrestamoPorRecordatorio(r: Recordatorio): Prestamo | undefined {
    return this.data.getPrestamoById(r.prestamoId);
  }

  // ── helpers privados ─────────────────────────────────

  private getEnviados(): Record<string, string> {
    const d = localStorage.getItem(this.SENT_KEY);
    if (!d) return {};
    try { return JSON.parse(d); } catch { return {}; }
  }

  private makeKey(prestamoId: string, cuotaNumero: number, tipo: string): string {
    return `${prestamoId}::${cuotaNumero}::${tipo}`;
  }

  private fechaSoloDia(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(d: Date, n: number): Date {
    const f = new Date(d);
    f.setDate(f.getDate() + n);
    return f;
  }
}
