import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../services/book.service';
import { IsbnLookupService, BookData } from '../../services/isbn-lookup.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-add-book',
  standalone: true,
  imports: [FormsModule, SlicePipe, StarRatingComponent],
  templateUrl: './add-book.component.html',
  styleUrl: './add-book.component.css',
})
export class AddBookComponent implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isbnService = inject(IsbnLookupService);
  private bookService = inject(BookService);

  closed = output<void>();

  mode = signal<'isbn' | 'manual'>('isbn');

  // ISBN mode
  isbn = signal('');
  isLoading = signal(false);
  errorMsg = signal('');
  bookData = signal<BookData | null>(null);
  rating = signal(0);
  notes = signal('');
  imgError = signal(false);

  // Manual mode
  manualTitle = signal('');
  manualAuthors = signal('');
  manualPublisher = signal('');
  manualDate = signal('');
  manualPages = signal('');
  manualCover = signal('');
  manualRating = signal(0);
  manualNotes = signal('');

  isScanning = signal(false);
  hasBarcodeSupport = signal(false);

  videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');

  private stream?: MediaStream;
  private scanTimer?: ReturnType<typeof setInterval>;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.hasBarcodeSupport.set('BarcodeDetector' in window);
    }
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  lookup() {
    const isbnVal = this.isbn().trim();
    if (!isbnVal) return;
    this.isLoading.set(true);
    this.errorMsg.set('');
    this.bookData.set(null);
    this.imgError.set(false);

    this.isbnService.lookup(isbnVal).subscribe({
      next: data => {
        if (data) {
          this.bookData.set(data);
        } else {
          this.errorMsg.set(
            'No se encontró ningún libro con ese ISBN. Verifica el número e inténtalo de nuevo.',
          );
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error de conexión. Comprueba tu red e inténtalo de nuevo.');
        this.isLoading.set(false);
      },
    });
  }

  async startScanner() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.errorMsg.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 360 },
      });
      const el = this.videoEl()?.nativeElement;
      if (el) {
        el.srcObject = this.stream;
        await el.play();
      }
      this.isScanning.set(true);

      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8'],
      });

      this.scanTimer = setInterval(async () => {
        const video = this.videoEl()?.nativeElement;
        if (!video) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            this.isbn.set(codes[0].rawValue);
            this.stopScanner();
            this.lookup();
          }
        } catch {
          // detector puede fallar en algunos frames, es normal
        }
      }, 500);
    } catch {
      this.errorMsg.set('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  stopScanner() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = undefined;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = undefined;
    }
    this.isScanning.set(false);
  }

  isSaving = signal(false);

  addManual() {
    if (!this.manualTitle().trim() || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMsg.set('');

    const data: BookData = {
      isbn: '',
      title: this.manualTitle().trim(),
      authors: this.manualAuthors().split(',').map(a => a.trim()).filter(Boolean),
      description: '',
      coverUrl: this.manualCover().trim(),
      publishedDate: this.manualDate().trim(),
      publisher: this.manualPublisher().trim(),
      pageCount: parseInt(this.manualPages()) || 0,
      categories: [],
      language: '',
      rating: this.manualRating(),
      notes: this.manualNotes(),
      read: false,
    };

    this.bookService.add(data).subscribe({
      next: () => this.closed.emit(),
      error: () => {
        this.errorMsg.set('Error al guardar el libro. Inténtalo de nuevo.');
        this.isSaving.set(false);
      },
    });
  }

  addBook() {
    const data = this.bookData();
    if (!data || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMsg.set('');

    this.bookService.add({ ...data, rating: this.rating(), notes: this.notes() }).subscribe({
      next: () => this.closed.emit(),
      error: () => {
        this.errorMsg.set('Error al guardar el libro. Inténtalo de nuevo.');
        this.isSaving.set(false);
      },
    });
  }

  close() {
    this.stopScanner();
    this.closed.emit();
  }

  onCoverError() {
    this.imgError.set(true);
  }
}
