import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Report {
  id?: number;
  fechaPedido: string;
  destinatario: string;
  ubicacionEntrega: string;
  costo: number;
  ganancia: number;
  comentarioPedido: string;
  estado: 'pendiente' | 'en_transito' | 'entregado' | 'cancelado';
  fechaEntrega?: string;
  total?: number;
  usuarioCreador?: string;
  createdAt?: string;
  updatedAt?: string;
  isConjunto?: boolean;
}

export interface ReportStats {
  statistics: {
    totalReports: number;
    totalCosto: number;
    totalGanancia: number;
    avgCosto: number;
    avgGanancia: number;
    pendientes: number;
    enTransito: number;
    entregados: number;
    cancelados: number;
  }
}

export interface ReportsResponse {
  success: boolean;
  data: {
    reports: Report[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    conjuntoAbiertoAlInicio?: boolean;
    conjuntoAbiertoAlFinal?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private http: HttpClient) { }

  getReports(filters?: {
    estado?: string;
    page?: number;
    limit?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<ReportsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.estado && filters.estado !== 'todos') {
        params = params.set('estado', filters.estado);
      }
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
    }

    return this.http.get<ReportsResponse>(`${environment.apiUrl}/reports`, { params })
      .pipe(
        catchError(error => {
          console.error('Error obteniendo reportes:', error);
          return throwError(() => error);
        })
      );
  }

  getReportById(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/reports/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo reporte:', error);
          return throwError(() => error);
        })
      );
  }

  createReport(report: Omit<Report, 'id'>): Observable<any> {
    const reportData = { ...report };

    return this.http.post<any>(`${environment.apiUrl}/reports`, reportData)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error creando reporte:', error);
          return throwError(() => error);
        })
      );
  }

  updateReport(id: number, report: Partial<Report>): Observable<any> {
    const reportData = { ...report };
    return this.http.put<any>(`${environment.apiUrl}/reports/${id}`, reportData)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error actualizando reporte:', error);
          return throwError(() => error);
        })
      );
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/reports/${id}`)
      .pipe(
        map(response => {
          return response;
        }),
        catchError(error => {
          console.error('Error eliminando reporte:', error);
          return throwError(() => error);
        })
      );
  }

  getReportStats(filters?: {
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
  }): Observable<{ success: boolean; data: ReportStats }> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.fechaDesde) {
        params = params.set('fechaDesde', filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        params = params.set('fechaHasta', filters.fechaHasta);
      }
      if (filters.estado && filters.estado !== 'todos') {
        params = params.set('estado', filters.estado);
      }
    }
    return this.http.get<{ success: boolean; data: ReportStats }>(`${environment.apiUrl}/reports/stats`, { params })
      .pipe(
        catchError(error => {
          console.error('Error obteniendo estadísticas:', error);
          return throwError(() => error);
        })
      );
  }

  getStats(fechaDesde?: string, fechaHasta?: string): Observable<ReportStats> {
    let params = new HttpParams();
    
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }

    return this.http.get<{ success: boolean; data: ReportStats }>(`${environment.apiUrl}/reports/stats`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error obteniendo estadísticas:', error);
          return throwError(() => error);
        })
      );
  }

  getReportsForChart(fechaDesde?: string, fechaHasta?: string, estado?: string): Observable<any> {
    let params = new HttpParams();
    
    if (fechaDesde) {
      params = params.set('fechaDesde', fechaDesde);
    }
    
    if (fechaHasta) {
      params = params.set('fechaHasta', fechaHasta);
    }
    
    if (estado && estado !== 'todos') {
      params = params.set('estado', estado);
    }

    return this.http.get<any>(`${environment.apiUrl}/reports/chart`, { params })
      .pipe(
        map(response => {
          if (response && response.success && response.data) {
            return response.data.chartData || [];
          }
          return [];
        }),
        catchError(error => {
          console.error('Error obteniendo datos del gráfico de reportes:', error);
          return throwError(() => error);
        })
      );
  }

  calculateTotal(costo: number, ganancia: number): number {
    return costo + ganancia;
  }

  getEstadoColor(estado: string): string {
    const colores = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'en_transito': 'bg-blue-100 text-blue-800',
      'entregado': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return colores[estado as keyof typeof colores] || 'bg-gray-100 text-gray-800';
  }

  getEstadoText(estado: string): string {
    const textos = {
      'pendiente': 'Pendiente',
      'en_transito': 'En Tránsito',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };
    return textos[estado as keyof typeof textos] || estado;
  }
}
