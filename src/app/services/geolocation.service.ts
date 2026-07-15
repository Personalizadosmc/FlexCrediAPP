import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/** Acceso a geolocalización nativa con respaldo para navegador. */
@Injectable({ providedIn: 'root' })
export class GeolocationService {

  /** Solicita permisos de ubicación al usuario */
  async solicitarPermisos(): Promise<boolean> {
    try {
      const p = await Geolocation.requestPermissions();
      return p.location === 'granted';
    } catch {
      // En navegador no hay API de permisos: asumimos true
      return true;
    }
  }

  /** Obtiene la posición actual (GPS) */
  async obtenerPosicionActual(): Promise<{lat: number; lng: number; accuracy: number} | null> {
    if (!Capacitor.isNativePlatform()) {
      return this.fallbackNavigator();
    }

    try {
      const pos: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
      return {
        lat:      pos.coords.latitude,
        lng:      pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch (err) {
      console.warn('[GeolocationService] Capacitor falló, usando navigator', err);
      return this.fallbackNavigator();
    }
  }

  /** Fallback: usar navigator.geolocation cuando estamos en el navegador */
  private fallbackNavigator(): Promise<{lat: number; lng: number; accuracy: number} | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('[GeolocationService] navigator.geolocation no disponible');
        // Ubicación fallback: Santo Domingo, RD
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }

  /** Calcula distancia en km entre dos coordenadas (fórmula Haversine) */
  calcularDistanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  }

  async geocodificarDireccion(direccion: string): Promise<{lat: number; lng: number; accuracy: number} | null> {
    const texto = (direccion || '').trim();
    if (!texto) return null;

    const variantes = [
      texto,
      `${texto}, Republica Dominicana`,
      `${texto}, Dominican Republic`,
    ];

    for (const q of variantes) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=do&q=${encodeURIComponent(q)}`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!resp.ok) continue;
        const data = await resp.json();
        const item = Array.isArray(data) ? data[0] : null;
        if (!item?.lat || !item?.lon) continue;
        return {
          lat: Number(item.lat),
          lng: Number(item.lon),
          accuracy: Number(item.importance || 0),
        };
      } catch (error) {
        console.warn('[GeolocationService] No se pudo geocodificar direccion', error);
      }
    }

    return null;
  }

  private toRad(deg: number): number { return deg * Math.PI / 180; }
}
