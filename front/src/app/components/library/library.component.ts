import { ChangeDetectionStrategy, Component, HostListener, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { BookCardComponent } from '../book-card/book-card.component';
import { AddBookComponent } from '../add-book/add-book.component';
import { BookDetailComponent } from '../book-detail/book-detail.component';

@Component({
  selector: 'app-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BookCardComponent, AddBookComponent, BookDetailComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css',
})
export class LibraryComponent {
  protected bookService = inject(BookService);
  protected auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  showAddModal = signal(false);
  selectedBook = signal<Book | null>(null);
  searchQuery  = signal('');

  private calcShelfSize(): number {
    if (!isPlatformBrowser(this.platformId)) return 6;
    // card: 148px, gap: 20px, padding lateral ~92px
    return Math.max(1, Math.floor((window.innerWidth - 92) / 168));
  }

  booksPerShelf = signal(this.calcShelfSize());

  @HostListener('window:resize')
  onResize() {
    this.booksPerShelf.set(this.calcShelfSize());
  }

  constructor() {
    this.bookService.load().subscribe();
  }

  filteredBooks = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.bookService.books();
    return this.bookService.books().filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        b.authors.some(a => a.toLowerCase().includes(q)) ||
        b.categories.some(c => c.toLowerCase().includes(q)),
    );
  });

  shelves = computed(() => {
    const books = this.filteredBooks();
    const size = this.booksPerShelf();
    const result: Book[][] = [];
    for (let i = 0; i < books.length; i += size) {
      result.push(books.slice(i, i + size));
    }
    return result;
  });

  avgRating = computed(() => {
    const rated = this.bookService.books().filter(b => b.rating > 0);
    if (!rated.length) return 0;
    return Math.round((rated.reduce((s, b) => s + b.rating, 0) / rated.length) * 10) / 10;
  });

  emptySlots(shelf: Book[]): number[] {
    return Array.from({ length: Math.max(0, this.booksPerShelf() - shelf.length) }, (_, i) => i);
  }

  syncNow(): void {
    this.bookService.sync().subscribe({ error: () => {} });
  }
}
