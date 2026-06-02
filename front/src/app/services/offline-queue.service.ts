import { Injectable, signal } from '@angular/core';

export type OpType = 'add' | 'update' | 'delete';

export interface PendingOp {
  opId: string;
  type: OpType;
  // add
  tempId?: string;
  bookData?: Record<string, unknown>;
  // update
  bookId?: string;
  changes?: Record<string, unknown>;
  // delete → usa bookId
}

const QUEUE_KEY = 'bib_pending_ops';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private _queue = signal<PendingOp[]>(this.load());

  /** Señal pública de solo lectura */
  readonly queue = this._queue.asReadonly();

  get hasPending(): boolean {
    return this._queue().length > 0;
  }

  /** Añade cualquier operación al final de la cola */
  enqueue(op: PendingOp): void {
    const q = [...this._queue(), op];
    this._commit(q);
  }

  /**
   * Para libros offline (tempId): mezcla cambios en el bookData
   * del add pendiente, para que al sincronizar se envíe ya con los últimos datos.
   */
  mergeIntoAdd(tempId: string, changes: Record<string, unknown>): void {
    const q = this._queue().map(op =>
      op.type === 'add' && op.tempId === tempId
        ? { ...op, bookData: { ...op.bookData, ...changes } }
        : op,
    );
    this._commit(q);
  }

  /**
   * Para libros ya sincronizados: crea o fusiona una operación update.
   * Si ya existe un update para ese bookId, mezcla los cambios en lugar
   * de encolar uno nuevo.
   */
  upsertUpdate(bookId: string, changes: Record<string, unknown>): void {
    const q = this._queue();
    const idx = q.findIndex(op => op.type === 'update' && op.bookId === bookId);
    if (idx >= 0) {
      const next = [...q];
      next[idx] = { ...next[idx], changes: { ...next[idx].changes, ...changes } };
      this._commit(next);
    } else {
      this.enqueue({ opId: crypto.randomUUID(), type: 'update', bookId, changes });
    }
  }

  /**
   * Elimina TODAS las operaciones relacionadas con un tempId
   * (cuando el usuario borra un libro que nunca llegó al servidor).
   */
  removeByTempId(tempId: string): void {
    const q = this._queue().filter(
      op => op.tempId !== tempId && op.bookId !== tempId,
    );
    this._commit(q);
  }

  /** Elimina una operación concreta ya procesada */
  remove(opId: string): void {
    const q = this._queue().filter(op => op.opId !== opId);
    this._commit(q);
  }

  /** Vacía la cola (tras sync exitosa) */
  clear(): void {
    this._commit([]);
  }

  // ── internos ─────────────────────────────────────────────────────

  private _commit(q: PendingOp[]): void {
    this._queue.set(q);
    if (q.length === 0) {
      localStorage.removeItem(QUEUE_KEY);
    } else {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    }
  }

  private load(): PendingOp[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
