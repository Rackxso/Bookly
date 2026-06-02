import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Book } from '../../models/book.model';
import { BookService } from '../../services/book.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, StarRatingComponent],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.css',
})
export class BookDetailComponent implements OnInit {
  private bookService = inject(BookService);

  book = input.required<Book>();
  closed = output<void>();

  rating = signal(0);
  notes = signal('');
  isEditing = signal(false);
  isSaving = signal(false);
  isDeleting = signal(false);
  showDelete = signal(false);
  imgError = signal(false);
  saved = signal(false);
  saveError = signal('');

  ngOnInit() {
    this.rating.set(this.book().rating);
    this.notes.set(this.book().notes);
  }

  save() {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set('');

    this.bookService
      .update(this.book().id, { rating: this.rating(), notes: this.notes() })
      .subscribe({
        next: () => {
          this.isEditing.set(false);
          this.isSaving.set(false);
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: () => {
          this.saveError.set('Error al guardar. Inténtalo de nuevo.');
          this.isSaving.set(false);
        },
      });
  }

  deleteBook() {
    if (this.isDeleting()) return;
    this.isDeleting.set(true);

    this.bookService.remove(this.book().id).subscribe({
      next: () => this.closed.emit(),
      error: () => {
        this.saveError.set('Error al eliminar. Inténtalo de nuevo.');
        this.isDeleting.set(false);
        this.showDelete.set(false);
      },
    });
  }

  close() {
    this.closed.emit();
  }

  get publishYear(): string {
    return this.book().publishedDate?.slice(0, 4) ?? '';
  }
}
