import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonCard, IonCardContent, IonSpinner,
  IonRippleEffect, IonRefresher, IonRefresherContent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  newspaperOutline, refreshOutline, alertCircleOutline,
  arrowBackOutline, bulbOutline, cashOutline, shieldCheckmarkOutline,
  trendingUpOutline, phonePortraitOutline, peopleOutline,
  homeOutline, listOutline, mapOutline, personOutline, timeOutline
} from 'ionicons/icons';
import { NoticiasService } from '../../services/noticias.service';
import { Noticia } from '../../models';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-novedades',
  templateUrl: './novedades.page.html',
  styleUrls: ['./novedades.page.scss'],
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    IonContent, IonIcon, IonCard, IonCardContent, IonSpinner,
    IonRippleEffect, IonRefresher, IonRefresherContent,
  ],
})
export class NovedadesPage implements OnInit, OnDestroy {

  noticias: Noticia[] = [];
  cargando = false;
  error: string | null = null;
  ultimaActualizacion: Date | null = null;
  usandoRespaldo = false;
  private noticiasSub: Subscription | null = null;

  constructor(
    private noticiasSvc: NoticiasService,
    private router: Router,
    private toast: ToastController
  ) {
    addIcons({
      newspaperOutline, refreshOutline, alertCircleOutline,
      arrowBackOutline, bulbOutline, cashOutline, shieldCheckmarkOutline,
      trendingUpOutline, phonePortraitOutline, peopleOutline,
      homeOutline, listOutline, mapOutline, personOutline, timeOutline
    });
  }

  ngOnInit() { this.cargarNoticias(); }

  ngOnDestroy() {
    this.noticiasSub?.unsubscribe();
  }

  cargarNoticias(event?: any) {
    this.noticiasSub?.unsubscribe();
    this.cargando = true;
    this.error = null;
    this.noticiasSub = this.noticiasSvc.obtenerNoticias().pipe(
      finalize(() => {
        this.cargando = false;
        event?.target?.complete?.();
      })
    ).subscribe({
      next: (data) => {
        this.noticias = data;
        this.usandoRespaldo = this.noticiasSvc.ultimoOrigen === 'local';
        this.ultimaActualizacion = new Date();
      },
      error: (err) => {
        this.error = 'No se pudieron cargar las noticias. Verifica tu conexión.';
        this.mostrarToast('Error al cargar noticias', 'danger');
      }
    });
  }

  // Pull-to-refresh handler
  onRefresh(event: any) { this.cargarNoticias(event); }

  // Reintentar tras error
  reintentar() { this.cargarNoticias(); }

  ir(r: string) { this.router.navigate([r]); }

  private async mostrarToast(msg: string, color: string) {
    const t = await this.toast.create({
      message: msg, duration: 2500, color, position: 'top',
      cssClass: 'fc-toast'
    });
    t.present();
  }

  // Categoría → color pastel
  colorCategoria(cat?: string): string {
    const map: Record<string, string> = {
      'Consejo Financiero': '#eab308',
      'Cobranza':           '#059669',
      'Regulación':         '#3b82f6',
      'Economía RD':        '#7c3aed',
      'Tecnología':         '#0891b2',
      'Cliente':            '#dc2626',
    };
    return map[cat || ''] || '#64748b';
  }
}
