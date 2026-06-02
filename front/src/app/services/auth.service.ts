import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';

const TOKEN_KEY = 'bib_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(this.restoreUser());

  get isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  get token(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { name, email, password })
      .pipe(tap(r => this.setSession(r)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap(r => this.setSession(r)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── Internos ─────────────────────────────────────────────

  private setSession(r: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(TOKEN_KEY, r.token);
    }
    this.currentUser.set(r.user);
    this.router.navigate(['/']);
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.currentUser.set(null);
  }

  private restoreUser(): User | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Comprueba expiración
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return { id: payload.sub, email: payload.email, name: payload.name };
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }
}
