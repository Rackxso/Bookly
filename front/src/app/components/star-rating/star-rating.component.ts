import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  template: `
    <div class="stars" [class.readonly]="readonly()">
      @for (s of [1, 2, 3, 4, 5]; track s) {
        <button
          class="star"
          type="button"
          [class.filled]="s <= (hovered() || value())"
          [class.hovered]="s <= hovered()"
          [disabled]="readonly()"
          [attr.aria-label]="s + ' estrellas'"
          (mouseenter)="onHover(s)"
          (mouseleave)="onLeave()"
          (click)="onClick(s)"
        >
          ★
        </button>
      }
    </div>
  `,
  styles: [
    `
      .stars {
        display: flex;
        gap: 2px;
      }
      .star {
        background: none;
        border: none;
        font-size: 1.3rem;
        cursor: pointer;
        color: #4a3a1a;
        transition:
          color 0.15s,
          transform 0.1s;
        padding: 0;
        line-height: 1;
      }
      .star.filled {
        color: #e8c870;
        text-shadow: 0 0 8px rgba(232, 200, 112, 0.5);
      }
      .star.hovered {
        transform: scale(1.25);
        color: #f0d890;
      }
      .stars.readonly .star {
        cursor: default;
        font-size: 1rem;
      }
    `,
  ],
})
export class StarRatingComponent {
  value = input<number>(0);
  readonly = input<boolean>(false);
  changed = output<number>();
  hovered = signal(0);

  onHover(s: number) {
    if (!this.readonly()) this.hovered.set(s);
  }
  onLeave() {
    this.hovered.set(0);
  }
  onClick(s: number) {
    if (this.readonly()) return;
    this.changed.emit(s === this.value() ? 0 : s);
  }
}
