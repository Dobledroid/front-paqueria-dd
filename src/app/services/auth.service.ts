import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.tokenKey);
    let user = null;
    
    if (token) {
      try {
        // Decodificar el token JWT para obtener la información del usuario
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp > Date.now() / 1000) {
          user = JSON.parse(localStorage.getItem('current_user') || 'null');
        } else {
          // Token expirado
          this.logout();
        }
      } catch (error) {
        console.error('Error al decodificar token:', error);
        this.logout();
      }
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public get isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  public get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Guardar token y usuario en localStorage
            localStorage.setItem(this.tokenKey, response.data.token);
            localStorage.setItem('current_user', JSON.stringify(response.data.user));
            
            // Actualizar el BehaviorSubject
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  register(userData: RegisterRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, userData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Auto-login después del registro
            localStorage.setItem(this.tokenKey, response.data.token);
            localStorage.setItem('current_user', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Error en registro:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    // Remover datos del localStorage
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('current_user');
    
    // Actualizar el BehaviorSubject
    this.currentUserSubject.next(null);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/user/profile`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo perfil:', error);
          if (error.status === 401) {
            this.logout();
          }
          return throwError(() => error);
        })
      );
  }

  updateProfile(userData: Partial<User>): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/user/profile`, userData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Actualizar usuario en localStorage y BehaviorSubject
            localStorage.setItem('current_user', JSON.stringify(response.data));
            this.currentUserSubject.next(response.data);
          }
          return response;
        }),
        catchError(error => {
          console.error('Error actualizando perfil:', error);
          return throwError(() => error);
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/user/change-password`, {
      currentPassword,
      newPassword
    }).pipe(
      catchError(error => {
        console.error('Error cambiando contraseña:', error);
        return throwError(() => error);
      })
    );
  }
}
