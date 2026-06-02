import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  catchError,
  concatMap,
  from,
  map,
  of,
  tap,
  throwError,
  toArray,
  switchMap,
  finalize,
} from 'rxjs';
import { Book } from '../models/book.model';
import { environment } from '../../environments/environment';
import { OfflineQueueService } from './offline-queue.service';
import { AuthService } from './auth.service';

const CACHE_PREFIX = 'bib_books_cache_';

@Injectable({ providedIn: 'root' })
export class BookService {
  private http = inject(HttpClient);
  private queue = inject(OfflineQueueService);
  private auth = inject(AuthService);

  private readonly API = `${environment.apiUrl}/api/books`;

  // ── Estado ───────────────────────────────────────────────────────
  books = signal<Book[]>([]);
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  isSyncing = signal(false);
  syncError = signal<string | null>(null);
  isOnline = signal(navigator.onLine);

  /** ¿Hay operaciones pendientes de enviar? */
  hasPendingSync = computed(() => this.queue.hasPending);
  /** Número de cambios pendientes */
  pendingCount = computed(() => this.queue.queue().length);

  constructor() {
    // Escucha cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline.set(true);
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────────

  /** Carga todos los libros desde la API (o la caché si no hay conexión) */
  load(): Observable<Book[]> {
    if (!this.isOnline()) {
      const cached = this._loadCache();
      this.books.set(cached);
      this.loadError.set(
        cached.length === 0 ? 'Sin conexión y sin datos en caché.' : null,
      );
      return of(cached);
    }

    this.isLoading.set(true);
    this.loadError.set(null);

    return this.http.get<Book[]>(this.API).pipe(
      tap(books => {
        this.books.set(books);
        this._saveCache(books);
        this.isLoading.set(false);
      }),
      catchError(err => {
        console.error('Error loading books:', err);
        // Fallback a caché
        const cached = this._loadCache();
        this.books.set(cached);
        this.loadError.set(
          'No se pudo conectar. Mostrando datos guardados localmente.',
        );
        this.isLoading.set(false);
        return of(cached);
      }),
    );
  }

  /** Añade un libro (guarda local si no hay conexión) */
  add(data: Partial<Book>): Observable<Book> {
    if (!this.isOnline()) {
      const localBook: Book = {
        ...(data as Book),
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        addedAt: new Date().toISOString(),
      };
      this.books.update(list => [localBook, ...list]);
      this.queue.enqueue({
        opId: crypto.randomUUID(),
        type: 'add',
        tempId: localBook.id,
        bookData: data as Record<string, unknown>,
      });
      this._saveCache(this.books());
      return of(localBook);
    }

    return this.http.post<Book>(this.API, data).pipe(
      tap(book => {
        this.books.update(list => [book, ...list]);
        this._saveCache(this.books());
      }),
    );
  }

  /** Actualiza un libro (guarda local si no hay conexión o si el libro es local) */
  update(id: string, changes: Partial<Book>): Observable<Book> {
    // Actualización local inmediata (UI reactiva)
    let updated: Book | undefined;
    this.books.update(list =>
      list.map(b => {
        if (b.id === id) {
          updated = { ...b, ...changes };
          return updated;
        }
        return b;
      }),
    );
    if (!updated) return throwError(() => new Error('Libro no encontrado'));

    if (!this.isOnline() || id.startsWith('local_')) {
      // Persiste en cola
      if (id.startsWith('local_')) {
        this.queue.mergeIntoAdd(id, changes as Record<string, unknown>);
      } else {
        this.queue.upsertUpdate(id, changes as Record<string, unknown>);
      }
      this._saveCache(this.books());
      return of(updated);
    }

    // Online: envía al servidor (la señal ya se actualizó optimistamente)
    return this.http.put<Book>(`${this.API}/${id}`, changes).pipe(
      tap(book => {
        this.books.update(list => list.map(b => (b.id === id ? book : b)));
        this._saveCache(this.books());
      }),
      catchError(err => {
        // Revierte si falla
        this.books.update(list =>
          list.map(b => (b.id === id ? (updated as Book) : b)),
        );
        return throwError(() => err);
      }),
    );
  }

  /** Elimina un libro (marca local si no hay conexión) */
  remove(id: string): Observable<void> {
    this.books.update(list => list.filter(b => b.id !== id));
    this._saveCache(this.books());

    if (!this.isOnline() || id.startsWith('local_')) {
      if (id.startsWith('local_')) {
        // Nunca llegó al servidor; basta con quitar sus ops pendientes
        this.queue.removeByTempId(id);
      } else {
        this.queue.enqueue({
          opId: crypto.randomUUID(),
          type: 'delete',
          bookId: id,
        });
      }
      return of(undefined);
    }

    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      // la señal ya se actualizó arriba
      catchError(err => {
        // Recarga para revertir si falla
        this.load().subscribe();
        return throwError(() => err);
      }),
    );
  }

  // ── SINCRONIZACIÓN ───────────────────────────────────────────────

  /**
   * Reproduce la cola de operaciones pendientes contra el servidor,
   * en orden, de forma secuencial.
   */
  sync(): Observable<void> {
    const ops = [...this.queue.queue()];
    if (!ops.length) return of(undefined);

    this.isSyncing.set(true);
    this.syncError.set(null);

    // Mapa tempId → realId para enlazar adds con sus updates
    const idMap = new Map<string, string>();

    return from(ops).pipe(
      concatMap(op => this._processOp(op, idMap)),
      toArray(), // espera a que todos terminen
      switchMap(() => this.http.get<Book[]>(this.API)), // recarga limpia
      tap(books => {
        this.books.set(books);
        this._saveCache(books);
        this.queue.clear(); // elimina cualquier resto
      }),
      map(() => undefined as void),
      finalize(() => this.isSyncing.set(false)),
      catchError(err => {
        console.error('Sync error:', err);
        this.syncError.set('Error al sincronizar. Inténtalo de nuevo.');
        return throwError(() => err);
      }),
    );
  }

  // ── Internos ─────────────────────────────────────────────────────

  private _processOp(
    op: (typeof this.queue.queue extends () => infer T ? T : never)[number],
    idMap: Map<string, string>,
  ): Observable<unknown> {
    if (op.type === 'add') {
      return this.http.post<Book>(this.API, op.bookData).pipe(
        tap(book => {
          idMap.set(op.tempId!, book.id);
          // Reemplaza el ID temporal en la señal local
          this.books.update(list =>
            list.map(b => (b.id === op.tempId ? book : b)),
          );
          this.queue.remove(op.opId);
        }),
      );
    }

    if (op.type === 'update') {
      const realId = idMap.get(op.bookId!) ?? op.bookId!;
      return this.http.put<Book>(`${this.API}/${realId}`, op.changes).pipe(
        tap(book => {
          this.books.update(list =>
            list.map(b => (b.id === realId ? book : b)),
          );
          this.queue.remove(op.opId);
        }),
        catchError(err => {
          // Si el libro ya no existe en el servidor, ignoramos
          if (err.status === 404) {
            this.queue.remove(op.opId);
            return of(null);
          }
          return throwError(() => err);
        }),
      );
    }

    if (op.type === 'delete') {
      const realId = idMap.get(op.bookId!) ?? op.bookId!;
      return this.http.delete<void>(`${this.API}/${realId}`).pipe(
        tap(() => this.queue.remove(op.opId)),
        catchError(err => {
          // 404 → ya estaba borrado, OK
          if (err.status === 404) {
            this.queue.remove(op.opId);
            return of(null);
          }
          return throwError(() => err);
        }),
      );
    }

    return of(null);
  }

  private _cacheKey(): string {
    return CACHE_PREFIX + (this.auth.currentUser()?.id ?? 'anon');
  }

  private _saveCache(books: Book[]): void {
    try {
      localStorage.setItem(this._cacheKey(), JSON.stringify(books));
    } catch {
      /* cuota excedida — ignoramos */
    }
  }

  private _loadCache(): Book[] {
    try {
      return JSON.parse(localStorage.getItem(this._cacheKey()) ?? '[]');
    } catch {
      return [];
    }
  }
}
