import { Component, input, output, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Book } from '../../models/book.model';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [SlicePipe, StarRatingComponent],
  template: `
    <article class="book-card" (click)="select.emit(book())">
      <div class="cover-wrapper">
        @if (book().coverUrl && !imgError()) {
          <img
            [src]="book().coverUrl"
            [alt]="book().title"
            class="cover-img"
            (error)="imgError.set(true)"
          />
        } @else {
          <div class="cover-placeholder" [style.background]="bookColor()">
            <span class="placeholder-title">{{ book().title }}</span>
            @if (book().authors[0]) {
              <span class="placeholder-author">{{ book().authors[0] }}</span>
            }
          </div>
        }
        <div class="cover-shine"></div>
        @if (book().read) {
          <div class="read-badge" title="Leído">✓</div>
        }
        <div class="cover-overlay">
          <p class="overlay-author">{{ book().authors.join(', ') }}</p>
          @if (book().publishedDate) {
            <p class="overlay-year">{{ book().publishedDate | slice: 0 : 4 }}</p>
          }
        </div>
      </div>
      <div class="book-spine"></div>
      <div class="book-info">
        <p class="book-title">{{ book().title }}</p>
        <app-star-rating [value]="book().rating" [readonly]="true" />
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .book-card {
        cursor: pointer;
        width: 148px;
        flex-shrink: 0;
        transition:
          transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
          filter 0.3s;
      }
      .book-card:hover {
        transform: translateY(-12px) scale(1.03);
        filter: drop-shadow(0 16px 24px rgba(0, 0, 0, 0.7));
      }
      .cover-wrapper {
        position: relative;
        width: 148px;
        height: 218px;
        border-radius: 3px 8px 8px 3px;
        overflow: hidden;
        box-shadow:
          6px 6px 20px rgba(0, 0, 0, 0.8),
          inset -4px 0 10px rgba(0, 0, 0, 0.4),
          -2px 0 0 rgba(0, 0, 0, 0.6);
      }
      .cover-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        gap: 0.5rem;
      }
      .placeholder-title {
        color: rgba(255, 255, 255, 0.95);
        font-family: 'Playfair Display', serif;
        font-size: 0.85rem;
        text-align: center;
        font-style: italic;
        text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.6);
        line-height: 1.3;
      }
      .placeholder-author {
        color: rgba(255, 255, 255, 0.7);
        font-family: 'Crimson Text', serif;
        font-size: 0.75rem;
        text-align: center;
        font-style: italic;
      }
      .read-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(122, 184, 144, 0.9);
        color: #1a1a1a;
        font-size: 0.65rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      }
      .cover-shine {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          transparent 50%,
          rgba(0, 0, 0, 0.1) 100%
        );
        pointer-events: none;
      }
      .cover-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 0.6rem 0.5rem 0.4rem;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s;
        transform: translateY(4px);
        transition:
          opacity 0.3s,
          transform 0.3s;
      }
      .book-card:hover .cover-overlay {
        opacity: 1;
        transform: translateY(0);
      }
      .overlay-author {
        color: #f2e4c0;
        font-size: 0.72rem;
        font-style: italic;
        text-align: center;
        line-height: 1.2;
      }
      .overlay-year {
        color: #c9a450;
        font-size: 0.65rem;
        text-align: center;
        margin-top: 2px;
      }
      .book-spine {
        width: 8px;
        height: 218px;
        background: linear-gradient(to right, #1a0a00, #3d1a08, #1a0a00);
        position: absolute;
        left: 0;
        top: 0;
        border-radius: 3px 0 0 3px;
        display: none;
      }
      .book-info {
        padding: 0.4rem 0.2rem 0;
        min-height: 52px;
      }
      .book-title {
        font-family: 'Crimson Text', serif;
        font-size: 0.82rem;
        color: #e8d5a3;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        margin-bottom: 0.2rem;
        line-height: 1.3;
        font-style: italic;
      }
    `,
  ],
})
export class BookCardComponent {
  book = input.required<Book>();
  select = output<Book>();
  imgError = signal(false);

  private static COLORS = [
    '#1e4d8c',
    '#2d6b3c',
    '#8b2b17',
    '#5b3d7a',
    '#1a6b6b',
    '#7a4a1a',
    '#2b4a6b',
    '#6b1a3d',
    '#3d6b1a',
    '#6b3015',
  ];

  bookColor() {
    let hash = 0;
    for (const c of this.book().title) hash = ((hash * 31 + c.charCodeAt(0)) | 0);
    return BookCardComponent.COLORS[Math.abs(hash) % BookCardComponent.COLORS.length];
  }
}
