import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonFab, IonFabButton, IonBadge,
  IonRippleEffect, IonSpinner, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, locateOutline, refreshOutline, mapOutline,
  homeOutline, listOutline, newspaperOutline, personOutline,
  peopleOutline, wifiOutline, cloudOfflineOutline, navigateOutline,
  businessOutline, callOutline, personCircleOutline
} from 'ionicons/icons';
import * as L from 'leaflet';
import { GeolocationService } from '../../services/geolocation.service';
import { DataService } from '../../services/data.service';
import { NetworkService } from '../../services/network.service';
import { Cliente } from '../../models';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonIcon, IonFab, IonFabButton, IonBadge,
    IonRippleEffect, IonSpinner,
  ],
})
export class MapaPage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  map!: L.Map;
  miMarker: L.Marker | null = null;
  clienteMarkers: L.Marker[] = [];
  readonly centroRD = { lat: 18.7357, lng: -70.1627 };

  clientes: Cliente[] = [];
  cargando = false;
  miPosicion: { lat: number; lng: number } | null = null;

  constructor(
    private router: Router,
    private geoSvc: GeolocationService,
    public  dataSvc: DataService,
    public  network: NetworkService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, locateOutline, refreshOutline, mapOutline,
      homeOutline, listOutline, newspaperOutline, personOutline,
      peopleOutline, wifiOutline, cloudOfflineOutline, navigateOutline,
      businessOutline, callOutline, personCircleOutline
    });
  }

  ngOnInit() {
    this.clientes = this.dataSvc.getClientes();
  }

  ionViewWillEnter() {
    this.clientes = this.dataSvc.getClientes();
    if (this.map) {
      setTimeout(() => this.actualizarUbicacionesClientes(), 200);
    }
  }

  ngAfterViewInit() {
    // Retrasar la inicialización para asegurar que el DOM esté listo
    setTimeout(() => this.inicializarMapa(), 300);
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  // ── INICIALIZAR MAPA LEAFLET ─────────────────────────
  private inicializarMapa() {
    // Coordenadas iniciales: Santo Domingo, RD
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    }).setView([this.centroRD.lat, this.centroRD.lng], 8);

    // Tile layer de OpenStreetMap (gratis, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);

    // Dibujar marcadores iniciales
    this.actualizarUbicacionesClientes();

    // Intentar centrar en mi ubicación
    this.centrarEnMiUbicacion(false);
  }

  // ── COORDENADAS DEMO (para clientes sin lat/lng) ─────
  private asignarCoordenadasDemo(base: { lat: number; lng: number }) {
    // Puntos de prueba alrededor de tu ubicacion actual.
    let cambios = false;
    this.clientes.forEach((c, i) => {
      if (c.latitud === undefined || c.longitud === undefined || this.esCoordenadaDemoSantoDomingo(c)) {
        // Distribuir en un radio de ~5km
        const angle = (i * 137.5) * (Math.PI / 180); // "golden angle" para distribución
        const radio = 0.006 + (i % 5) * 0.004;
        c.latitud  = base.lat + Math.cos(angle) * radio;
        c.longitud = base.lng + Math.sin(angle) * radio;
        cambios = true;
      }
    });
    if (cambios) this.dataSvc.saveClientes(this.clientes);
  }

  private esCoordenadaDemoSantoDomingo(c: Cliente): boolean {
    if (c.latitud === undefined || c.longitud === undefined) return false;
    const d = this.geoSvc.calcularDistanciaKm(c.latitud, c.longitud, 18.4861, -69.9312);
    return d < 8;
  }

  private async actualizarUbicacionesClientes() {
    await this.geocodificarClientesSinCoordenadas();
    this.dibujarMarcadoresClientes();
  }

  private async geocodificarClientesSinCoordenadas() {
    let cambios = false;
    for (const c of this.clientes) {
      if ((c.latitud === undefined || c.longitud === undefined || this.esCoordenadaDemoSantoDomingo(c)) && c.direccion) {
        const pos = await this.geoSvc.geocodificarDireccion(c.direccion);
        if (pos) {
          c.latitud = pos.lat;
          c.longitud = pos.lng;
          cambios = true;
        }
      }
    }
    if (cambios) this.dataSvc.saveClientes(this.clientes);
  }

  // ── DIBUJAR MARCADORES DE CLIENTES ───────────────────
  private dibujarMarcadoresClientes() {
    // Limpiar marcadores previos
    this.clienteMarkers.forEach(m => m.remove());
    this.clienteMarkers = [];

    this.clientes.forEach(c => {
      if (c.latitud !== undefined && c.longitud !== undefined) {
        const iniciales = this.dataSvc.getIniciales(c.nombre);
        const color = this.dataSvc.getAvatarColor(c.nombre);
        const prestamos = this.dataSvc.getPrestamosByCliente(c.id).filter(p => p.estado !== 'completado').length;

        // Icono personalizado (avatar circular)
        const iconHtml = `
          <div class="cliente-marker" style="background:${color}">
            <span>${iniciales}</span>
            ${prestamos > 0 ? `<div class="marker-badge">${prestamos}</div>` : ''}
          </div>`;
        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: [42, 42],
          iconAnchor: [21, 42],
          popupAnchor: [0, -40],
        });

        const marker = L.marker([c.latitud, c.longitud], { icon }).addTo(this.map);

        const popup = `
          <div class="cli-popup">
            <div class="pop-header" style="background:${color}">
              <div class="pop-av">${iniciales}</div>
              <div>
                <p class="pop-name">${c.nombre}</p>
                <p class="pop-ced">🪪 ${c.cedula}</p>
              </div>
            </div>
            <div class="pop-body">
              <p>📞 ${c.telefono}</p>
              <p>📍 ${c.direccion || 'Sin dirección'}</p>
              <p>💼 ${prestamos} préstamo(s) activo(s)</p>
            </div>
          </div>`;
        marker.bindPopup(popup, { maxWidth: 280 });
        this.clienteMarkers.push(marker);
      }
    });
  }

  // ── CENTRAR EN MI UBICACIÓN ──────────────────────────
  async centrarEnMiUbicacion(mostrarToast = true) {
    this.cargando = true;
    const ok = await this.geoSvc.solicitarPermisos();
    if (!ok && mostrarToast) {
      this.mostrarToast('Permiso de ubicación denegado', 'warning');
    }
    const pos = await this.geoSvc.obtenerPosicionActual();
    this.cargando = false;
    if (!pos) {
      if (mostrarToast) {
        const msg = !window.isSecureContext
          ? 'iPhone requiere HTTPS para ubicaci\u00f3n precisa. Usa ionic serve --external --ssl.'
          : 'No se pudo obtener la ubicaci\u00f3n. Activa la ubicaci\u00f3n precisa para Safari.';
        this.mostrarToast(msg, 'danger');
      }
      return;
    }
    this.miPosicion = pos;
    await this.actualizarUbicacionesClientes();

    // Quitar marker previo
    if (this.miMarker) this.miMarker.remove();

    // Icono personalizado para "mi ubicación"
    const iconHtml = `<div class="mi-marker"><ion-icon></ion-icon></div>`;
    const icon = L.divIcon({
      html: '<div class="mi-marker-outer"><div class="mi-marker-inner"></div></div>',
      className: 'mi-ubicacion-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    this.miMarker = L.marker([pos.lat, pos.lng], { icon }).addTo(this.map);
    this.miMarker.bindPopup(`
      <div class="mi-pop">
        <strong>📍 Tu ubicación</strong><br>
        <small>Precisión: ±${Math.round(pos.accuracy)}m</small>
      </div>
    `);

    // Centrar mapa
    this.map.setView([pos.lat, pos.lng], 15);
    if (mostrarToast) this.mostrarToast('Ubicación actualizada', 'success');
  }

  contarUbicados(): number {
    return this.clientes.filter(c => c.latitud !== undefined && c.longitud !== undefined).length;
  }

  // ── VER CLIENTES CERCANOS ────────────────────────────
  contarCercanos(): number {
    if (!this.miPosicion) return 0;
    return this.clientes.filter(c => {
      if (c.latitud === undefined || c.longitud === undefined) return false;
      const d = this.geoSvc.calcularDistanciaKm(
        this.miPosicion!.lat, this.miPosicion!.lng, c.latitud, c.longitud
      );
      return d <= 3; // 3km
    }).length;
  }

  ir(r: string) { this.router.navigate([r]); }

  private async mostrarToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({
      message: msg, duration: 2200, color, position: 'top', cssClass: 'fc-toast'
    });
    t.present();
  }
}
