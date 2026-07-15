export interface Usuario {
  id: string; nombre: string; email: string; password: string;
  nombreEmpresa: string;
  fechaRegistro: string;
  fotoPerfil?: string;
  carrera?: string;
  telefono?: string;
  documento?: string;
  fechaNacimiento?: string;
  profesion?: string;
  estadoCivil?: string;
  direccion?: string;
}

export interface Cliente {
  id: string; nombre: string; cedula: string; telefono: string;
  email: string;
  direccion: string; fechaRegistro: string;
  latitud?: number;
  longitud?: number;
  fotoComprobante?: string;
}

export interface Prestamo {
  id: string; clienteId: string; clienteNombre: string; clienteTelefono: string;
  clienteEmail?: string;
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
  emailEnviado?: boolean;
  fotoComprobante?: string;
}

export interface Noticia {
  id: number;
  title: string;
  body: string;
  fecha: string;
  categoria?: string;
  icono?: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  clienteId?: string;
  clienteNombre?: string;
  prioridad: 'alta' | 'media' | 'baja';
  fechaLimite?: string;
  completada: boolean;
  estado?: 'pendiente' | 'completada' | 'cancelada';
  fechaCreacion: string;
  orden: number;
  tipo: 'llamada' | 'visita' | 'cobro' | 'general';
}

export interface Podcast {
  id: string;
  titulo: string;
  autor: string;
  descripcion: string;
  duracion: string;
  urlAudio: string;
  urlPortada: string;
  categoria: string;
}

export interface Compartido {
  id: string;
  tipo: 'nfc' | 'bluetooth' | 'qr';
  destino: string;
  contenido: string;
  fecha: string;
  exito: boolean;
}

export interface AppConfig {
  temaOscuro: boolean;
  notificaciones: boolean;
  sonidos: boolean;
  autoSincronizar: boolean;
  vibracion: boolean;
}
