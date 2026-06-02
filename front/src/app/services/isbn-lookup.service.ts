import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { Book } from '../models/book.model';
import { environment } from '../../environments/environment';

export type BookData = Omit<Book, 'id' | 'rating' | 'notes' | 'addedAt'>;

@Injectable({ providedIn: 'root' })
export class IsbnLookupService {
  private http = inject(HttpClient);

  lookup(isbn: string): Observable<BookData | null> {
    const clean = isbn.replace(/[-\s]/g, '');
    return this.googleBooks(clean).pipe(
      switchMap(r => (r ? of(r) : this.openLibrary(clean))),
      catchError(() => of(null)),
    );
  }

  private googleBooks(isbn: string): Observable<BookData | null> {
    return this.http
      .get<any>(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${environment.googleBooksApiKey}`)
      .pipe(
        map(r => {
          if (!r.items?.[0]) return null;
          const v = r.items[0].volumeInfo;
          return {
            isbn,
            title: v.title ?? 'Sin título',
            authors: v.authors ?? ['Autor desconocido'],
            description: v.description ?? '',
            coverUrl:
              v.imageLinks?.thumbnail?.replace('http:', 'https:') ??
              `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
            publishedDate: v.publishedDate ?? '',
            publisher: v.publisher ?? '',
            pageCount: v.pageCount ?? 0,
            categories: v.categories ?? [],
            language: v.language ?? '',
          } as BookData;
        }),
        catchError(() => of(null)),
      );
  }

  private openLibrary(isbn: string): Observable<BookData | null> {
    return this.http
      .get<any>(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      )
      .pipe(
        map(r => {
          const d = r[`ISBN:${isbn}`];
          if (!d) return null;
          return {
            isbn,
            title: d.title ?? 'Sin título',
            authors: d.authors?.map((a: any) => a.name) ?? ['Autor desconocido'],
            description: typeof d.notes === 'string' ? d.notes : '',
            coverUrl:
              d.cover?.large ??
              d.cover?.medium ??
              `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
            publishedDate: d.publish_date ?? '',
            publisher: d.publishers?.[0]?.name ?? '',
            pageCount: d.number_of_pages ?? 0,
            categories: d.subjects?.slice(0, 5).map((s: any) => s.name) ?? [],
            language: '',
          } as BookData;
        }),
        catchError(() => of(null)),
      );
  }
}
