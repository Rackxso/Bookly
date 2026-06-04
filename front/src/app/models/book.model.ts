export interface Book {
  id: string;
  isbn: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
  publishedDate: string;
  publisher: string;
  pageCount: number;
  categories: string[];
  language: string;
  rating: number;
  notes: string;
  read: boolean;
  addedAt: string;
}
