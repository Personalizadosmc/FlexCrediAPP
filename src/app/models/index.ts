export interface Usuario {
  id: string; nombre: string; email: string; password: string;
  fechaRegistro: string;
}
export interface Cliente {
  id: string; nombre: string; cedula: string; telefono: string;
  direccion: string; fechaRegistro: string;
}
export interface Prestamo {
  id: string; clienteId: string; clienteNombre: string; clienteTelefono: string;
  monto: number; interes: number;
  frecuencia: 'semanal' | 'quincenal' | 'mensual';
  numeroCuotas: number; cuotaMonto: number; totalPagar: number;
  fechaInicio: string; fechaPrimerPago: string;
  estado: 'activo' | 'completado' | 'atrasado';
  cuotas: Cuota[];
}
export interface Cuota {
  numero: number; fechaVencimiento: string; monto: number;
  estado: 'pagada' | 'pendiente' | 'atrasada'; fechaPago?: string;
}
export interface Pago {
  id: string; prestamoId: string; clienteId: string; clienteNombre: string;
  cuotaNumero: number; monto: number; fecha: string; notificadoWhatsapp: boolean;
}
