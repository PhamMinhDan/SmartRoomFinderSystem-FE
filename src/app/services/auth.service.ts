import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UserResponse {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url: string;
  phone_number?: string;
  bio?: string;
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
  private apiUrl = 'http://localhost:8080/api'; // Thay đổi URL này theo backend của bạn
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
      .post<ApiResponse<AuthGoogleResponse>>(`${this.apiUrl}/auth/google-login`, {}, { headers })
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
    const token = this.getItem('accessToken');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<ApiResponse<UserResponse>>(`${this.apiUrl}/user/me`, { headers }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setItem('currentUser', JSON.stringify(response.data));
          this.currentUserSubject.next(response.data);
        }
      }),
    );
  }

  logout(): Observable<ApiResponse<string>> {
    const token = this.getItem('accessToken');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/auth/logout`, {}, { headers }).pipe(
      tap(() => {
        this.removeItem('accessToken');
        this.removeItem('refreshToken');
        this.removeItem('currentUser');
        this.currentUserSubject.next(null);
      }),
    );
  }

  isLoggedIn(): boolean {
    return !!this.getItem('accessToken');
  }
}
