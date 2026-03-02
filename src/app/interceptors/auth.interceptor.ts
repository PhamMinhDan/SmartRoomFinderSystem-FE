import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const accessToken = authService.getAccessToken();
  const refreshToken = authService.getRefreshToken();

  if (req.url.includes('/api/auth/')) {
    return next(req);
  }

  let authReq = req;

  if (accessToken) {
    authReq = addToken(req, accessToken);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      if (!refreshToken) {
        authService.clearSessionLocal();
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshTokenSubject.pipe(
          filter((token) => token !== null),
          take(1),
          switchMap((token) => next(addToken(req, token!))),
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap((res: any) => {
          const newAccessToken = res?.accessToken;

          if (!newAccessToken) {
            throw new Error('No access token returned');
          }

          isRefreshing = false;

          refreshTokenSubject.next(newAccessToken);
          authService.setTokens(newAccessToken, refreshToken);

          return next(addToken(req, newAccessToken));
        }),
        catchError((err) => {
          isRefreshing = false;
          refreshTokenSubject.next(null);
          authService.clearSessionLocal();

          return throwError(() => err);
        }),
      );
    }),
  );
};

function addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
