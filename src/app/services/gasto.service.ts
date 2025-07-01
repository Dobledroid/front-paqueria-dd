import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Gasto {
  id?: number;
  fecha: string;
  descripcion: string;
  comentarios: string;
  total: number;
  usuarioCreador?: any;
  createdAt?: string;
  updatedAt?: string;
  _id?: string; 
}

export interface GastoStats {
  total: number;
  totalGastado: number;
  promedioGasto: number;
}

export interface GastoFilters {
  page?: number;
  limit?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GastoService {

  constructor(private http: HttpClient) { }

  getGastos(filters: GastoFilters = {}): Observable<any> {
    let params = new HttpParams();
    
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }
    
    if (filters.fechaDesde) {
      params = params.set('fechaDesde', filters.fechaDesde);
    }
    
    if (filters.fechaHasta) {
      params = params.set('fechaHasta', filters.fechaHasta);
    }
    
    if (filters.descripcion) {
      params = params.set('descripcion', filters.descripcion);
    }

    return this.http.get<any>(`${environment.apiUrl}/gastos`, { params })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  createGasto(gasto: Omit<Gasto, 'id'>): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/gastos`, gasto)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getGastoById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/gastos/${id}`)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  updateGasto(id: string, gasto: Partial<Gasto>): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/gastos/${id}`, gasto)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error actualizando gasto:', error);
          return throwError(() => error);
        })
      );
  }

  deleteGasto(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/gastos/${id}`)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error eliminando gasto:', error);
          return throwError(() => error);
        })
      );
  }

  getGastoStats(filters?: {
    fechaDesde?: string;
    fechaHasta?: string;
    descripcion?: string;
  }): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.fechaDesde) {
        params = params.set('fechaDesde', filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        params = params.set('fechaHasta', filters.fechaHasta);
      }
      if (filters.descripcion) {
        params = params.set('descripcion', filters.descripcion);
      }
    }
    
    return this.http.get<any>(`${environment.apiUrl}/gastos/stats`, { params })
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getGastosForChart(fechaDesde?: string, fechaHasta?: string, tipo?: string): Observable<any> {
    let params = new HttpParams();
    
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }
    
    if (tipo && tipo !== 'todos') {
      params = params.set('tipo', tipo);
    }

    return this.http.get<any>(`${environment.apiUrl}/gastos/chart`, { params })
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            return response.data.chartData || [];
          }
          return [];
        }),
        catchError(error => {
          console.error('Error obteniendo datos del gráfico de gastos:', error);
          return throwError(() => error);
        })
      );
  }
}
