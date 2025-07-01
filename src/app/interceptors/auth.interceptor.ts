import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // URLs que no necesitan autenticación
    const authUrls = ['/api/auth/login', '/api/auth/register'];
    const isAuthUrl = authUrls.some(url => request.url.includes(url));
    
    // Obtener el token del servicio de autenticación
    const token = this.authService.token;
    
    // Si NO es una URL de autenticación Y existe token, agregar Authorization header
    if (!isAuthUrl && token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Para URLs de auth o cuando no hay token, solo agregar Content-Type
      request = request.clone({
        setHeaders: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Manejar la respuesta y errores
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ha ocurrido un error';

        if (error.error instanceof ErrorEvent) {
          // Error del lado del cliente
          errorMessage = `Error: ${error.error.message}`;
        } else {
          // Error del lado del servidor
          switch (error.status) {
            case 400:
              errorMessage = error.error?.message || 'Solicitud incorrecta';
              break;
            case 401:
              if (isAuthUrl) {
                // Para rutas de auth, mostrar mensaje específico
                errorMessage = error.error?.message || 'Credenciales inválidas';
              } else {
                errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente';
                // Auto logout solo si NO es una URL de autenticación
                this.authService.logout();
              }
              break;
            case 403:
              errorMessage = 'Acceso denegado. No tienes permisos suficientes';
              break;
            case 404:
              errorMessage = 'Recurso no encontrado';
              break;
            case 422:
              errorMessage = error.error?.message || 'Datos de entrada inválidos';
              break;
            case 500:
              errorMessage = 'Error interno del servidor. Intenta más tarde';
              break;
            case 0:
              errorMessage = 'No se puede conectar al servidor. Verifica tu conexión';
              break;
            default:
              errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
          }
        }

        console.error('HTTP Error:', {
          status: error.status,
          message: errorMessage,
          url: error.url,
          error: error.error
        });

        // Retornar el error con mensaje personalizado
        return throwError(() => ({
          ...error,
          userMessage: errorMessage
        }));
      })
    );
  }
}
