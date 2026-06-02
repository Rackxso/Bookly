import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  effect,
  input,
  signal,
} from '@angular/core';

export interface ShelfBook {
  id: string;
  title: string;
  author?: string;
  color?: string;
  spineAccentColor?: string;
  width?: number;
  height?: number;
}

export interface ShelfConfig {
  books: ShelfBook[];
  shelfWidth?: number;
  shelfColor?: string;
  showKnot?: boolean;
}

@Component({
  selector: 'app-bookshelf',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bookshelf">
      @for (shelf of shelves(); track $index) {
        <div class="shelf-row">
          <div class="books-row">
            @for (book of shelf; track book.id) {
              <button
                class="book-spine"
                type="button"
                [style.width.px]="book.width ?? 18"
                [style.height.px]="book.height ?? 200"
                [style.background]="book.color ?? '#1e4d8c'"
                (click)="selectBook(book)"
                [title]="book.title + (book.author ? ' — ' + book.author : '')"
              >
                @if (book.spineAccentColor) {
                  <span class="spine-accent" [style.background]="book.spineAccentColor"></span>
                }
                <span class="spine-title">{{ book.title }}</span>
              </button>
            }
          </div>
          <div class="shelf-plank">
            <div class="shelf-plank-edge"></div>
            @if (config().showKnot !== false) {
              <div class="shelf-knot"></div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .bookshelf { display: flex; flex-direction: column; gap: 0; }

      .shelf-row { position: relative; padding-top: 1.5rem; }

      .books-row {
        display: flex;
        gap: 4px;
        align-items: flex-end;
        padding: 20px 1.5rem 0.6rem;
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: #5c2e0e transparent;
      }

      .book-spine {
        flex-shrink: 0;
        border: none;
        border-radius: 1px 3px 3px 1px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        box-shadow:
          2px 2px 8px rgba(0, 0, 0, 0.7),
          inset -2px 0 4px rgba(0, 0, 0, 0.3),
          inset 2px 0 2px rgba(255, 255, 255, 0.06);
        transition:
          transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
          filter 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }

      .book-spine:hover {
        transform: translateY(-10px);
        filter: brightness(1.2) drop-shadow(0 10px 16px rgba(0, 0, 0, 0.7));
      }

      .book-spine:focus-visible {
        outline: 2px solid rgba(201, 164, 80, 0.8);
        outline-offset: 2px;
      }

      .spine-accent {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 3px;
        pointer-events: none;
      }

      .spine-title {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        transform: rotate(180deg);
        font-family: 'IM Fell English', serif;
        font-size: 0.58rem;
        color: rgba(255, 255, 255, 0.88);
        overflow: hidden;
        max-height: 90%;
        white-space: nowrap;
        padding: 0 2px;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        pointer-events: none;
        user-select: none;
      }

      .shelf-plank {
        height: 22px;
        background: linear-gradient(
          180deg,
          #7a4020 0%,
          #5c2e0e 25%,
          #8b4a20 50%,
          #5c2e0e 75%,
          #3d1a08 100%
        );
        border-radius: 0 0 3px 3px;
        position: relative;
        box-shadow:
          0 6px 12px rgba(0, 0, 0, 0.7),
          inset 0 2px 4px rgba(255, 200, 100, 0.08),
          inset 0 -1px 3px rgba(0, 0, 0, 0.5);
      }

      .shelf-plank-edge {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 0 0 3px 3px;
      }

      .shelf-knot {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #b06020 0%, #5c2e0e 100%);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
      }
    `,
  ],
})
export class BookshelfComponent implements OnChanges {
  config = input<ShelfConfig>({ books: [] });
  onBookSelect = input<(book: ShelfBook) => void>();

  shelves = signal<ShelfBook[][]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.shelves.set(this.buildShelves(this.config()));
    }
  }

  private buildShelves(cfg: ShelfConfig): ShelfBook[][] {
    const maxWidth = (cfg.shelfWidth ?? 560) - 48;
    const shelves: ShelfBook[][] = [];
    let row: ShelfBook[] = [];
    let rowW = 0;

    for (const book of cfg.books) {
      const w = (book.width ?? 18) + 4;
      if (rowW + w > maxWidth && row.length > 0) {
        shelves.push(row);
        row = [];
        rowW = 0;
      }
      row.push(book);
      rowW += w;
    }
    if (row.length) shelves.push(row);

    return shelves;
  }

  selectBook(book: ShelfBook): void {
    this.onBookSelect()?.(book);
  }
}
