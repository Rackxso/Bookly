import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  // Añade el JWT a todas las peticiones a /api
  const authReq =
    token && req.url.startsWith('/api')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Si el servidor responde 401, la sesión expiró → cerrar sesión
      if (err.status === 401 && req.url.startsWith('/api') && !req.url.includes('/auth/')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
