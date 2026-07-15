import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonList, IonItem, IonLabel, IonRange,
  IonRippleEffect, IonSpinner, IonBadge,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, playOutline, pauseOutline, playSkipBackOutline,
  playSkipForwardOutline, stopOutline, headsetOutline,
  homeOutline, listOutline, newspaperOutline, mapOutline, personOutline,
  timeOutline, musicalNotesOutline
} from 'ionicons/icons';
import { Podcast } from '../../models';

@Component({
  selector: 'app-podcasts',
  templateUrl: './podcasts.page.html',
  styleUrls: ['./podcasts.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonIcon, IonList, IonItem, IonLabel, IonRange,
    IonRippleEffect, IonSpinner, IonBadge,
  ],
})
export class PodcastsPage implements OnInit, OnDestroy {

  @ViewChild('audioPlayer', { static: true }) audioPlayerRef!: ElementRef<HTMLAudioElement>;

  // Catálogo de episodios
  podcasts: Podcast[] = [
    {
      id: 'pd-1',
      titulo: 'Educación Financiera Básica',
      autor: 'FlexCredi Academy',
      descripcion: '5 consejos para manejar tus finanzas personales de manera inteligente',
      duracion: '3:45',
      urlAudio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      urlPortada: 'https://picsum.photos/seed/finance1/200',
      categoria: 'Educación',
    },
    {
      id: 'pd-2',
      titulo: 'Cómo hacer préstamos inteligentes',
      autor: 'FlexCredi Academy',
      descripcion: 'Guía completa sobre las mejores prácticas al otorgar préstamos personales',
      duracion: '5:20',
      urlAudio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      urlPortada: 'https://picsum.photos/seed/finance2/200',
      categoria: 'Préstamos',
    },
    {
      id: 'pd-3',
      titulo: 'Estrategias de cobranza efectiva',
      autor: 'FlexCredi Academy',
      descripcion: 'Aprende las mejores técnicas de cobranza sin dañar la relación con el cliente',
      duracion: '4:12',
      urlAudio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      urlPortada: 'https://picsum.photos/seed/finance3/200',
      categoria: 'Cobranza',
    },
    {
      id: 'pd-4',
      titulo: 'Análisis de riesgo crediticio',
      autor: 'FlexCredi Academy',
      descripcion: 'Cómo evaluar la capacidad de pago de un cliente antes de aprobar un préstamo',
      duracion: '6:30',
      urlAudio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      urlPortada: 'https://picsum.photos/seed/finance4/200',
      categoria: 'Análisis',
    },
    {
      id: 'pd-5',
      titulo: 'Tecnología en el sector financiero',
      autor: 'FlexCredi Academy',
      descripcion: 'FinTech, IA y automatización: cómo transformar tu negocio de préstamos',
      duracion: '4:55',
      urlAudio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      urlPortada: 'https://picsum.photos/seed/finance5/200',
      categoria: 'Tecnología',
    },
  ];

  reproduciendo: Podcast | null = null;
  isPlaying = false;
  cargando = false;
  currentTime = 0;
  duration = 0;
  progreso = 0;
  volumen = 80;

  constructor(private router: Router, private toast: ToastController) {
    addIcons({
      arrowBackOutline, playOutline, pauseOutline, playSkipBackOutline,
      playSkipForwardOutline, stopOutline, headsetOutline,
      homeOutline, listOutline, newspaperOutline, mapOutline, personOutline,
      timeOutline, musicalNotesOutline
    });
  }

  ngOnInit() {
    const audio = this.audioPlayerRef.nativeElement;
    if (!this.reproduciendo && this.podcasts.length > 0) {
      this.reproduciendo = this.podcasts[0];
      audio.src = this.reproduciendo.urlAudio;
      audio.load();
    }
    audio.addEventListener('timeupdate', () => {
      this.currentTime = audio.currentTime;
      this.duration    = audio.duration || 0;
      this.progreso    = this.duration ? (this.currentTime / this.duration) * 100 : 0;
    });
    audio.addEventListener('loadstart', () => this.cargando = true);
    audio.addEventListener('canplay',   () => this.cargando = false);
    audio.addEventListener('ended',     () => this.siguiente());
    audio.addEventListener('play',      () => this.isPlaying = true);
    audio.addEventListener('pause',     () => this.isPlaying = false);
    audio.volume = this.volumen / 100;
  }

  ngOnDestroy() {
    const audio = this.audioPlayerRef?.nativeElement;
    if (audio) { audio.pause(); audio.src = ''; }
  }

  // ── CONTROLES ────────────────────────────────────────
  async seleccionar(p: Podcast) {
    if (this.reproduciendo?.id === p.id) {
      return this.togglePlay();
    }
    this.reproduciendo = p;
    const audio = this.audioPlayerRef.nativeElement;
    audio.src = p.urlAudio;
    try {
      await audio.play();
      this.mostrarToast(`Reproduciendo: ${p.titulo}`, 'success');
    } catch (err) {
      this.mostrarToast('Error al reproducir el audio', 'danger');
    }
  }

  togglePlay() {
    const audio = this.audioPlayerRef.nativeElement;
    if (audio.paused) audio.play(); else audio.pause();
  }

  stop() {
    const audio = this.audioPlayerRef.nativeElement;
    audio.pause();
    audio.currentTime = 0;
    this.reproduciendo = null;
    this.progreso = 0;
  }

  siguiente() {
    if (!this.reproduciendo) return;
    const idx = this.podcasts.findIndex(p => p.id === this.reproduciendo!.id);
    const next = this.podcasts[(idx + 1) % this.podcasts.length];
    this.seleccionar(next);
  }

  anterior() {
    if (!this.reproduciendo) return;
    const idx = this.podcasts.findIndex(p => p.id === this.reproduciendo!.id);
    const prev = this.podcasts[(idx - 1 + this.podcasts.length) % this.podcasts.length];
    this.seleccionar(prev);
  }

  // ── SEEK ────────────────────────────────────────────
  onRangeChange(event: any) {
    const value = Number(event.detail.value ?? 0);
    const audio = this.audioPlayerRef.nativeElement;
    if (this.duration) {
      audio.currentTime = (value / 100) * this.duration;
    }
  }

  onVolumenChange(event: any) {
    const audio = this.audioPlayerRef.nativeElement;
    this.volumen = Number(event.detail.value ?? 0);
    audio.volume = this.volumen / 100;
  }

  // ── HELPERS ──────────────────────────────────────────
  formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  colorCategoria(c: string): string {
    const map: Record<string, string> = {
      'Educación':  '#3b82f6',
      'Préstamos':  '#f59e0b',
      'Cobranza':   '#059669',
      'Análisis':   '#7c3aed',
      'Tecnología': '#0891b2',
    };
    return map[c] || '#64748b';
  }

  ir(r: string) { this.router.navigate([r]); }

  private async mostrarToast(msg: string, color: string) {
    const t = await this.toast.create({
      message: msg, duration: 2000, color, position: 'top', cssClass: 'fc-toast'
    });
    t.present();
  }
}
