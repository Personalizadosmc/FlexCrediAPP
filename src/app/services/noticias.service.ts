import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, delay, timeout } from 'rxjs/operators';
import { Noticia } from '../models';

/** Obtiene y adapta noticias financieras desde la API configurada. */
@Injectable({ providedIn: 'root' })
export class NoticiasService {

  private API_URL = 'https://jsonplaceholder.typicode.com/posts';
  ultimoOrigen: 'api' | 'local' = 'api';

  // Categorías + iconos para dar sentido financiero a las noticias
  private categorias = [
    { nombre: 'Consejo Financiero', icono: 'bulb-outline'          },
    { nombre: 'Cobranza',           icono: 'cash-outline'          },
    { nombre: 'Regulación',         icono: 'shield-checkmark-outline' },
    { nombre: 'Economía RD',        icono: 'trending-up-outline'   },
    { nombre: 'Tecnología',         icono: 'phone-portrait-outline' },
    { nombre: 'Cliente',            icono: 'people-outline'        },
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las noticias desde la API REST
   * Simula un delay de 600ms para mostrar el spinner de carga.
   */
  obtenerNoticias(): Observable<Noticia[]> {
    return this.http.get<any[]>(this.API_URL).pipe(
      timeout(8000),
      delay(600),
      map(posts => {
        this.ultimoOrigen = 'api';
        return posts.slice(0, 20).map(p => this.transformar(p));
      }),
      catchError(err => {
        this.manejarError(err);
        this.ultimoOrigen = 'local';
        return of(this.noticiasLocales());
      })
    );
  }

  /**
   * Obtener detalle de una noticia específica
   */
  obtenerNoticiaPorId(id: number): Observable<Noticia> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map(p => this.transformar(p)),
      catchError(err => {
        this.manejarError(err);
        return of(this.noticiasLocales().find(n => n.id === id) || this.noticiasLocales()[0]);
      })
    );
  }

  // ── Helpers ───────────────────────────────────────────
  private transformar(post: any): Noticia {
    const cat = this.categorias[post.id % this.categorias.length];
    // Fecha aleatoria dentro de los últimos 30 días
    const dias = post.id % 30;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return {
      id: post.id,
      title: this.capitalizarTitulo(post.title),
      body:  this.capitalizarBody(post.body),
      fecha: fecha.toISOString(),
      categoria: cat.nombre,
      icono:     cat.icono,
    };
  }

  private capitalizarTitulo(t: string): string {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  private capitalizarBody(b: string): string {
    return b.replace(/\n/g, ' ').charAt(0).toUpperCase() + b.replace(/\n/g,' ').slice(1);
  }

  private noticiasLocales(): Noticia[] {
    const base = [
      {
        title: 'Cinco se\u00f1ales para detectar un pr\u00e9stamo en riesgo',
        body: 'Revisa atrasos repetidos, pagos parciales, cambios de tel\u00e9fono, promesas sin fecha y clientes que evitan confirmar visitas.',
        categoria: 'Cobranza',
      },
      {
        title: 'C\u00f3mo organizar rutas de cobro m\u00e1s eficientes',
        body: 'Agrupa clientes por zona, prioriza cuotas vencidas y deja margen para llamadas antes de visitar cada sector.',
        categoria: 'Consejo Financiero',
      },
      {
        title: 'Buenas pr\u00e1cticas para registrar pagos en campo',
        body: 'Confirma el monto, guarda evidencia, actualiza la cuota al instante y comparte comprobante antes de cerrar la visita.',
        categoria: 'Tecnologia',
      },
      {
        title: 'Cuando renegociar una cuota sin perder control',
        body: 'Renegocia solo con fechas claras, historial visible y compromiso escrito. Evita extender plazos sin revisar el riesgo total.',
        categoria: 'Regulacion',
      },
    ];

    return base.map((n, index) => {
      const categoria = this.categorias.find(c => c.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === n.categoria) || this.categorias[0];
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - index);
      return {
        id: index + 1,
        title: n.title,
        body: n.body,
        fecha: fecha.toISOString(),
        categoria: categoria.nombre,
        icono: categoria.icono,
      };
    });
  }

  private manejarError(error: HttpErrorResponse) {
    let msg = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      msg = `Error de red: ${error.error.message}`;
    } else {
      msg = `Servidor respondió con código ${error.status}`;
    }
    console.error('[NoticiasService]', msg);
  }
}
