import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AddressResponse {
  address_id: number;
  street_address: string;
  city_name: string;
  district_name: string;
  ward_name: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  user_id: string;
  username: string;
  email: string;
  full_name: string | null;
  avatar_url: string;
  phone_number?: string;
  bio?: string;
  address: AddressResponse | null;
  identity_verified: boolean;
  role_name: string;
  is_active: boolean;
  auth_provider: string;
  is_oauth_user: boolean;
  created_at: string;
  last_login: string;
}

export interface AuthGoogleResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}`;
  private currentUserSubject: BehaviorSubject<UserResponse | null>;
  public currentUser: Observable<UserResponse | null>;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    let storedUser = null;
    if (this.isBrowser) {
      const storedUserStr = localStorage.getItem('currentUser');
      storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    }

    this.currentUserSubject = new BehaviorSubject<UserResponse | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): UserResponse | null {
    return this.currentUserSubject.value;
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  private getItem(key: string): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private removeItem(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  loginWithGoogle(idToken: string): Observable<ApiResponse<AuthGoogleResponse>> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<ApiResponse<AuthGoogleResponse>>(`${this.baseUrl}/auth/google-login`, {}, { headers })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setItem('accessToken', response.data.accessToken);
            this.setItem('refreshToken', response.data.refreshToken);
            this.setItem('currentUser', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
        }),
      );
  }

  getCurrentUser(): Observable<ApiResponse<UserResponse>> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.baseUrl}/user/me`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setItem('currentUser', JSON.stringify(response.data));
          this.currentUserSubject.next(response.data);
        }
      }),
    );
  }

  logout(): Observable<ApiResponse<string> | null> {
    const token = this.getItem('accessToken');

    if (!token) {
      this.clearSession();
      return new Observable((observer) => {
        observer.next(null);
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/auth/logout`, {}, { headers }).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession(),
      }),
    );
  }

  private clearSession(): void {
    this.removeItem('accessToken');
    this.removeItem('refreshToken');
    this.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return this.getItem('refreshToken');
  }

  clearSessionLocal(): void {
    this.removeItem('accessToken');
    this.removeItem('refreshToken');
    this.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getItem('refreshToken');

    return this.http.post(`${this.baseUrl}/auth/refresh-token`, {
      refreshToken: refreshToken,
    });
  }

  getAccessToken(): string | null {
    return this.getItem('accessToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.setItem('accessToken', accessToken);
    this.setItem('refreshToken', refreshToken);
  }

  tryRefreshOnStart(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.refreshToken().subscribe({
        next: (res: any) => {
          if (res?.accessToken) {
            this.setTokens(res.accessToken, res.refreshToken ?? refreshToken);
            this.getCurrentUser().subscribe({
              next: () => resolve(),
              error: () => resolve(),
            });
          } else {
            resolve();
          }
        },
        error: () => {
          this.clearSessionLocal();
          resolve();
        },
      });
    });
  }
}
