import { Injectable } from '@angular/core';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private SESSION = 'fc_session';
  private USERS   = 'fc_usuarios';

  getUsuarios(): Usuario[] {
    const d = localStorage.getItem(this.USERS);
    return d ? JSON.parse(d) : [];
  }

  registrar(nombre: string, email: string, password: string): { ok: boolean; msg: string } {
    const lista = this.getUsuarios();
    if (lista.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, msg: 'Este correo ya está registrado' };
    const u: Usuario = { id: `U-${Date.now()}`, nombre, email, password, fechaRegistro: new Date().toISOString() };
    lista.push(u);
    localStorage.setItem(this.USERS, JSON.stringify(lista));
    return { ok: true, msg: 'Cuenta creada exitosamente' };
  }

  login(email: string, password: string): { ok: boolean; msg: string } {
    const u = this.getUsuarios().find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) return { ok: false, msg: 'Correo o contraseña incorrectos' };
    localStorage.setItem(this.SESSION, JSON.stringify(u));
    return { ok: true, msg: 'Bienvenido ' + u.nombre };
  }

  logout() { localStorage.removeItem(this.SESSION); }
  isLoggedIn() { return !!localStorage.getItem(this.SESSION); }
  getUser(): Usuario | null {
    const d = localStorage.getItem(this.SESSION);
    return d ? JSON.parse(d) : null;
  }
}
