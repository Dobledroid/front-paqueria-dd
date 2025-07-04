import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportService, Report, ReportStats } from '../services/report.service';
import { GastoService, Gasto, GastoStats } from '../services/gasto.service';
import { Pagination } from '../models/pagination.model';
import * as moment from 'moment';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit {
  /**
   * Busca conjuntos de elementos entre comentarios "inicio" y "fin" en el campo indicado.
   * Al encontrar un conjunto, lo muestra por consola.
   * @param lista Array de elementos (reportes, gastos, etc)
   * @param campoComentario Nombre del campo de comentario (por defecto 'comentarioPedido')
   */
  esConjunto(lista: any[], campoComentario: string = 'comentarioPedido'): void {
    // Limpia la marca de conjunto previa
    for (const item of lista) {
      if (item.hasOwnProperty('isConjunto')) {
        delete item.isConjunto;
      }
    }
    let conjuntoActual: any[] = [];
    let dentroDeConjunto = false;
    for (const item of lista) {
      const comentario = (item[campoComentario] || '').toLowerCase();
      if (comentario.includes('inicio')) {
        dentroDeConjunto = true;
        conjuntoActual = [item];
      } else if (comentario.includes('fin') && dentroDeConjunto) {
        conjuntoActual.push(item);
        // Marca todos los elementos del conjunto
        conjuntoActual.forEach((el) => (el.isConjunto = true));
        console.log('El conjunto es:', conjuntoActual);
        dentroDeConjunto = false;
        conjuntoActual = [];
      } else if (dentroDeConjunto) {
        conjuntoActual.push(item);
      }
    }
    // Si termina la lista y hay un conjunto abierto, puedes decidir si marcarlo o ignorarlo
    if (dentroDeConjunto && conjuntoActual.length > 0) {
      conjuntoActual.forEach((el) => (el.isConjunto = true));
      console.log('Conjunto sin cerrar (sin "fin"): ', conjuntoActual);
    }
  }
  paginationReportes: Pagination | null = null;
  paginationGastos: Pagination | null = null;
  @ViewChild('barChart', { static: false })
  barChart!: ElementRef<HTMLCanvasElement>;

  loadingMetrics = true;
  loadingReports = true;
  loadingChart = true;
  loadingAction = false;

  metricas = {
    totalPaquetes: 0,
    dineroInvertido: 0,
    ganancias: 0,
    gastos: 0,
    total: 0,
  };

  metricasMesAnterior = {
    totalPaquetes: 15,
    dineroInvertido: 2500,
    ganancias: 3200,
    gastos: 800,
    total: 2400,
  };

  // Variable para rastrear si hay datos del mes anterior
  hayDatosMesAnterior = false;

  resumenMesAnterior = {
    mes: '',
    anio: 0,
    inversion: 0,
    ganancias: 0,
    gastos: 0,
    total: 0,
  };

  fechaInicio: string = '';
  fechaFin: string = '';
  filtroEstado: string = 'todos';

  reportes: Report[] = [];
  reportStats: ReportStats = {
    statistics: {
      totalReports: 0,
      totalCosto: 0,
      totalGanancia: 0,
      avgCosto: 0,
      avgGanancia: 0,
      pendientes: 0,
      enTransito: 0,
      entregados: 0,
      cancelados: 0,
    },
  };

  chart: Chart | null = null;

  mostrarModal = false;
  modoEdicion = false;
  reporteEditando: Report | null = null;
  nuevoReporte: Partial<Report> = {};

  // Eliminados: paginaActual, itemsPorPagina, totalPaginas

  alertMessage = '';
  alertType: 'success' | 'error' | '' = '';

  modalAlertMessage = '';
  modalAlertType: 'success' | 'error' | '' = '';

  gastos: Gasto[] = [];
  gastoStats: GastoStats = {
    total: 0,
    totalGastado: 0,
    promedioGasto: 0,
  };

  mostrarModalGasto = false;
  modoEdicionGasto = false;
  gastoEditando: Gasto | null = null;
  nuevoGasto: Partial<Gasto> = {};

  fechaInicioGasto: string = '';
  fechaFinGasto: string = '';
  filtroDescripcion: string = '';

  // Eliminados: paginaActualGasto, itemsPorPaginaGasto, totalPaginasGasto

  loadingGastos = true;

  modalAlertMessageGasto = '';
  modalAlertTypeGasto: 'success' | 'error' | '' = '';

  rangoMesesChart = 3;
  rangoMesesOpciones = [
    { valor: 3, etiqueta: '3 meses' },
    { valor: 6, etiqueta: '6 meses' },
    { valor: 12, etiqueta: '12 meses' },
    { valor: 0, etiqueta: 'Todos' },
  ];

  datosAgrupadosPorMes: any[] = [];

  constructor(
    private reportService: ReportService,
    private gastoService: GastoService
  ) {
    const hoy = moment();
    const primerDiaMes = moment().startOf('month');

    this.fechaFin = hoy.format('YYYY-MM-DD');
    this.fechaInicio = primerDiaMes.format('YYYY-MM-DD');

    this.fechaFinGasto = hoy.format('YYYY-MM-DD');
    this.fechaInicioGasto = primerDiaMes.format('YYYY-MM-DD');

    this.nuevoReporte = this.getDefaultReport();
    this.nuevoGasto = this.getDefaultGasto();
  }

  private getDefaultReport(): Partial<Report> {
    return {
      fechaPedido: moment().format('YYYY-MM-DDTHH:mm'),
      destinatario: '',
      ubicacionEntrega: '',
      costo: 0,
      ganancia: 0,
      comentarioPedido: '',
      estado: 'pendiente',
    };
  }

  private getDefaultGasto(): Partial<Gasto> {
    return {
      fecha: moment().format('YYYY-MM-DDTHH:mm'),
      descripcion: '',
      comentarios: '',
      total: 0,
    };
  }

  ngOnInit(): void {
    const hoy = moment();
    const primerDiaMes = moment().startOf('month');

    this.fechaFin = hoy.format('YYYY-MM-DD');
    this.fechaInicio = primerDiaMes.format('YYYY-MM-DD');

    this.fechaFinGasto = hoy.format('YYYY-MM-DD');
    this.fechaInicioGasto = primerDiaMes.format('YYYY-MM-DD');

    // Inicializar paginación usando el objeto Pagination unificado
    this.paginationReportes = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    };
    this.paginationGastos = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
    };

    this.loadDashboardData().then(() => {
      this.updateMetricCardColors();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.createFallbackChart();
    }, 100);

    setTimeout(() => {
      this.actualizarGraficaConRango();
    }, 2000);
  }

  async loadDashboardData(): Promise<void> {
    try {
      await Promise.all([
        this.loadReportStats(),
        this.loadGastoStats(),
        this.loadMetricasMesAnterior(),
      ]);

      await Promise.all([this.loadReports(), this.loadGastos()]);
    } catch (error) {
      this.mostrarAlerta('Error cargando datos del dashboard', 'error');
    }
  }

  async loadReports(): Promise<void> {
    try {
      this.loadingReports = true;
      const filters: any = {
        page: this.paginationReportes?.currentPage || 1,
        limit: this.paginationReportes?.itemsPerPage || 10,
      };

      if (this.filtroEstado !== 'todos') {
        filters.estado = this.filtroEstado;
      }

      if (this.fechaInicio) {
        const fechaInicioConHora =
          moment(this.fechaInicio)
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaDesde = fechaInicioConHora;
      }

      if (this.fechaFin) {
        const fechaFinConHora =
          moment(this.fechaFin).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS') +
          'Z';
        filters.fechaHasta = fechaFinConHora;
      }

      const response = await this.reportService.getReports(filters).toPromise();

      if (response?.success) {
        this.reportes = response.data.reports || [];
        if (response.data.pagination) {
          this.paginationReportes = response.data.pagination;
        }
        // Detectar conjuntos automáticamente al cargar reportes
        this.esConjunto(this.reportes, 'comentarioPedido');
      } else {
        this.reportes = [];
      }
    } catch (error) {
      this.reportes = [];
      console.error('💥 FRONTEND loadReports - Error:', error);
    } finally {
      this.loadingReports = false;
    }
  }

  async loadReportStats(): Promise<void> {
    try {
      const filters: any = {};

      if (this.fechaInicio) {
        const fechaInicioConHora =
          moment(this.fechaInicio)
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaDesde = fechaInicioConHora;
      }

      if (this.fechaFin) {
        const fechaFinConHora =
          moment(this.fechaFin).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS') +
          'Z';
        filters.fechaHasta = fechaFinConHora;
      }

      if (this.filtroEstado !== 'todos') {
        filters.estado = this.filtroEstado;
      }

      const response = await this.reportService
        .getReportStats(filters)
        .toPromise();

      if (response?.success) {
        this.reportStats = response.data;

        console.log(this.reportStats)
        this.metricas.dineroInvertido =
          this.reportStats.statistics?.totalCosto || 0;
        this.metricas.ganancias =
          this.reportStats.statistics?.totalGanancia || 0;
          this.metricas.totalPaquetes = this.reportStats.statistics?.totalReports || 0;
        this.updateTotals();
      }
    } catch (error) {
      console.error('💥 FRONTEND loadReportStats - Error:', error);
    }
  }

  async loadGastos(): Promise<void> {
    try {
      this.loadingGastos = true;
      const filters: any = {
        page: this.paginationGastos?.currentPage || 1,
        limit: this.paginationGastos?.itemsPerPage || 10,
      };

      if (this.filtroDescripcion) {
        filters.descripcion = this.filtroDescripcion;
      }

      if (this.fechaInicioGasto) {
        const fechaInicioConHora =
          moment(this.fechaInicioGasto)
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaDesde = fechaInicioConHora;
      }

      if (this.fechaFinGasto) {
        const fechaFinConHora =
          moment(this.fechaFinGasto)
            .endOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaHasta = fechaFinConHora;
      }

      const response = await this.gastoService.getGastos(filters).toPromise();

      if (response?.success) {
        this.gastos = response.data.gastos || [];
        if (response.data.pagination) {
          this.paginationGastos = response.data.pagination;
        }
        this.metricas.gastos = this.gastoStats.totalGastado || 0;
        this.updateTotals();
        // Detectar conjuntos automáticamente al cargar gastos
        this.esConjunto(this.gastos, 'comentarios');
      } else {
        this.gastos = [];
      }
    } catch (error) {
      this.gastos = [];
    } finally {
      this.loadingGastos = false;
    }
  }

  async loadGastoStats(): Promise<void> {
    try {
      const filters: any = {};

      if (this.fechaInicioGasto) {
        const fechaInicioConHora =
          moment(this.fechaInicioGasto)
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaDesde = fechaInicioConHora;
      }

      if (this.fechaFinGasto) {
        const fechaFinConHora =
          moment(this.fechaFinGasto)
            .endOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        filters.fechaHasta = fechaFinConHora;
      }

      if (this.filtroDescripcion) {
        filters.descripcion = this.filtroDescripcion;
      }

      const response = await this.gastoService
        .getGastoStats(filters)
        .toPromise();
      if (response?.success) {
        this.gastoStats = response.data;

        this.metricas.gastos = this.gastoStats.totalGastado || 0;
        this.updateTotals();
      }
    } catch (error) {}
  }

  async loadChartData(): Promise<void> {
    try {
      this.loadingChart = true;
      this.createChart();
    } catch (error) {
      this.createChart();
    } finally {
      this.loadingChart = false;
    }
  }

  createChart(): void {
    if (!this.barChart) return;

    const ctx = this.barChart.nativeElement.getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx!, {
      type: 'bar',
      data: {
        labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
        datasets: [
          {
            label: 'Paquetes del Mes',
            data: [234, 267, 289, 301, 278, 287],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          },
          {
            label: 'Dinero Invertido (Miles)',
            data: [123, 145, 156, 134, 149, 145],
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          },
          {
            label: 'Ganancias (Miles)',
            data: [78, 89, 95, 82, 91, 89],
            backgroundColor: 'rgba(168, 85, 247, 0.5)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 1,
          },
          {
            label: 'Gastos (Miles)',
            data: [45, 56, 61, 52, 58, 56],
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
          },
          {
            label: 'Total (Miles)',
            data: [156, 178, 190, 164, 182, 178],
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Análisis Completo - Últimos 6 Meses',
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  async cambiarRangoMeses(nuevoRango: number): Promise<void> {
    this.rangoMesesChart = nuevoRango;
    await this.actualizarGraficaConRango();
  }

  private async actualizarGraficaConRango(): Promise<void> {
    this.loadingChart = true;

    try {
      const fechas = this.calcularFechasRango(this.rangoMesesChart);

      const [reportes, gastos] = await Promise.all([
        this.obtenerReportesPorRango(fechas.inicio, fechas.fin),
        this.obtenerGastosPorRango(fechas.inicio, fechas.fin),
      ]);

      this.datosAgrupadosPorMes = this.agruparDatosPorMes(
        reportes,
        gastos,
        fechas.inicio,
        fechas.fin
      );

      if (this.datosAgrupadosPorMes.length > 0) {
        this.crearGraficaConDatosAgrupados();
      } else {
        this.createFallbackChart();
      }
    } catch (error) {
      this.createFallbackChart();
    } finally {
      this.loadingChart = false;
    }
  }

  private calcularFechasRango(meses: number): { inicio: string; fin: string } {
    const hoy = moment();

    const fin = hoy.clone().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';

    let inicio: string;
    if (meses === 0) {
      const fechaInicio = moment()
        .subtract(24, 'months')
        .startOf('month')
        .startOf('day');
      inicio = fechaInicio.format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
    } else {
      const fechaInicio = moment()
        .subtract(meses - 1, 'months')
        .startOf('month')
        .startOf('day');
      inicio = fechaInicio.format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
    }

    return { inicio, fin };
  }

  private async obtenerReportesPorRango(
    fechaInicio: string,
    fechaFin: string
  ): Promise<any[]> {
    try {
      const response = await this.reportService
        .getReportsForChart(fechaInicio, fechaFin, 'todos')
        .toPromise();

      return response || [];
    } catch (error) {
      return [];
    }
  }

  private async obtenerGastosPorRango(
    fechaInicio: string,
    fechaFin: string
  ): Promise<any[]> {
    try {
      const response = await this.gastoService
        .getGastosForChart(fechaInicio, fechaFin, 'todos')
        .toPromise();

      return response || [];
    } catch (error) {
      console.error('💥 FRONTEND obtenerGastosPorRango - Error:', error);
      return [];
    }
  }

  private agruparDatosPorMes(
    reportes: any[],
    gastos: any[],
    fechaInicio: string,
    fechaFin: string
  ): any[] {
    const mesesEnRango = this.generarMesesEnRango(fechaInicio, fechaFin);

    const datosAgrupados = mesesEnRango.map((mes) => {
      const reporteDelMes = reportes.find((r) => {
        const mesReporte = `${r.year}-${r.month.toString().padStart(2, '0')}`;
        return mesReporte === mes.clave;
      });

      const gastoDelMes = gastos.find((g) => {
        const mesGasto = `${g.year}-${g.month.toString().padStart(2, '0')}`;
        return mesGasto === mes.clave;
      });

      const totalPaquetes = reporteDelMes?.totalReportes || 0;
      const dineroInvertido = reporteDelMes?.totalCosto || 0;
      const ganancias = reporteDelMes?.totalGanancia || 0;
      const gastosMes = gastoDelMes?.totalMonto || 0;
      const total = ganancias - gastosMes;

      const datosDelMes = {
        mes: mes.etiqueta,
        clave: mes.clave,
        totalPaquetes,
        dineroInvertido,
        ganancias,
        gastos: gastosMes,
        total,
      };

      return datosDelMes;
    });

    return datosAgrupados;
  }

  private generarMesesEnRango(
    fechaInicio: string,
    fechaFin: string
  ): { clave: string; etiqueta: string }[] {
    const meses: { clave: string; etiqueta: string }[] = [];
    // Usar .utc() para parsear las fechas como UTC y evitar problemas de zona horaria
    const inicio = moment.utc(fechaInicio);
    const fin = moment.utc(fechaFin);

    let mesActual = inicio.clone().startOf('month');

    while (mesActual.isSameOrBefore(fin, 'month')) {
      const clave = mesActual.format('YYYY-MM');
      const etiqueta = mesActual.format('MMM YYYY');

      meses.push({
        clave,
        etiqueta,
      });
      mesActual.add(1, 'month');
    }

    return meses;
  }

  private crearGraficaConDatosAgrupados(): void {
    if (!this.barChart || !this.barChart.nativeElement) {
      setTimeout(() => this.crearGraficaConDatosAgrupados(), 100);
      return;
    }

    if (this.datosAgrupadosPorMes.length === 0) {
      this.createFallbackChart();
      return;
    }

    const ctx = this.barChart.nativeElement.getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.datosAgrupadosPorMes.map((d) => d.mes);
    const paquetes = this.datosAgrupadosPorMes.map((d) => d.totalPaquetes);
    const dineroInvertido = this.datosAgrupadosPorMes.map(
      (d) => d.dineroInvertido
    );
    const ganancias = this.datosAgrupadosPorMes.map((d) => d.ganancias);
    const gastos = this.datosAgrupadosPorMes.map((d) => d.gastos);
    const total = this.datosAgrupadosPorMes.map((d) => d.total);

    this.chart = new Chart(ctx!, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Paquetes',
            data: paquetes,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: 'Dinero Invertido',
            data: dineroInvertido,
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
          {
            label: 'Ganancias',
            data: ganancias,
            backgroundColor: 'rgba(168, 85, 247, 0.7)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
          {
            label: 'Gastos',
            data: gastos,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
          {
            label: 'Total',
            data: total,
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Análisis de ${this.obtenerEtiquetaRango()} - Datos Agrupados por Mes`,
          },
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Paquetes',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Monto ($)',
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function (value) {
                return '$' + Number(value).toLocaleString();
              },
            },
          },
        },
      },
    });
  }

  private obtenerEtiquetaRango(): string {
    const opcion = this.rangoMesesOpciones.find(
      (op) => op.valor === this.rangoMesesChart
    );
    return opcion ? `Últimos ${opcion.etiqueta}` : 'Período seleccionado';
  }

  createFallbackChart(): void {
    if (!this.barChart || !this.barChart.nativeElement) {
      setTimeout(() => this.createFallbackChart(), 100);
      return;
    }

    const ctx = this.barChart.nativeElement.getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx!, {
      type: 'bar',
      data: {
        labels: ['Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'],
        datasets: [
          {
            label: 'Paquetes',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: 'Dinero Invertido',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
          {
            label: 'Ganancias',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(168, 85, 247, 0.7)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
          {
            label: 'Gastos',
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Sin datos disponibles - Últimos 3 meses',
          },
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Cantidad de Paquetes',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Monto ($)',
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function (value) {
                return '$' + Number(value).toLocaleString();
              },
            },
          },
        },
      },
    });
  }

  async aplicarFiltros(): Promise<void> {
    if (this.paginationReportes) {
      this.paginationReportes.currentPage = 1;
    }
    await this.loadReports();
    await this.loadReportStats();
    await this.actualizarGraficaConRango();
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.fechaFin = hoy.toISOString().split('T')[0];
    this.fechaInicio = primerDiaMes.toISOString().split('T')[0];

    this.aplicarFiltros();
  }

  irAPagina(pagina: number): void {
    if (
      this.paginationReportes &&
      pagina >= 1 &&
      pagina <= this.paginationReportes.totalPages
    ) {
      this.paginationReportes.currentPage = pagina;
      this.loadReports();
    }
  }

  paginaAnterior(): void {
    if (this.paginationReportes && this.paginationReportes.currentPage > 1) {
      this.paginationReportes.currentPage--;
      this.loadReports();
    }
  }

  paginaSiguiente(): void {
    if (
      this.paginationReportes &&
      this.paginationReportes.currentPage < this.paginationReportes.totalPages
    ) {
      this.paginationReportes.currentPage++;
      this.loadReports();
    }
  }

  get paginasArray(): number[] {
    if (!this.paginationReportes) return [];
    const paginas = [];
    for (let i = 1; i <= this.paginationReportes.totalPages; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  abrirModal(reporte?: Report): void {
    this.mostrarModal = true;
    if (reporte) {
      this.modoEdicion = true;
      this.reporteEditando = reporte;
      this.nuevoReporte = {
        fechaPedido: this.formatearFechaParaInput(reporte.fechaPedido),
        destinatario: reporte.destinatario,
        ubicacionEntrega: reporte.ubicacionEntrega,
        costo: reporte.costo,
        ganancia: reporte.ganancia,
        comentarioPedido: reporte.comentarioPedido || '',
        estado: reporte.estado,
      };
    } else {
      this.modoEdicion = false;
      this.reporteEditando = null;
      this.nuevoReporte = this.resetNuevoReporte();
    }
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.modoEdicion = false;
    this.reporteEditando = null;
    this.nuevoReporte = this.resetNuevoReporte();
    this.cerrarAlertaModal();
  }

  async guardarReporte(): Promise<void> {
    if (!this.validarFormulario()) {
      return;
    }

    try {
      this.loadingAction = true;
      let response;

      const fechaPedidoMoment = moment(this.nuevoReporte.fechaPedido);
      const reporteData = {
        ...this.nuevoReporte,
        fechaPedido: fechaPedidoMoment.format('YYYY-MM-DDTHH:mm:ss'),
      };

      if (this.modoEdicion && this.reporteEditando) {
        response = await this.reportService
          .updateReport(this.reporteEditando.id!, reporteData)
          .toPromise();
      } else {
        response = await this.reportService
          .createReport(reporteData as Omit<Report, 'id'>)
          .toPromise();
      }

      if (response?.success) {
        this.mostrarAlerta(
          this.modoEdicion
            ? 'Reporte actualizado exitosamente'
            : 'Reporte creado exitosamente',
          'success'
        );
        this.cerrarModal();
        await Promise.all([this.loadReports(), this.loadReportStats()]);
        await this.actualizarGraficaConRango();
      } else {
        this.mostrarAlertaModal(
          'Error al guardar el reporte: ' +
            (response?.message || 'Error desconocido'),
          'error'
        );
      }
    } catch (error: any) {
      const errorMessage =
        error?.error?.message ||
        error?.message ||
        'Error al guardar el reporte';
      this.mostrarAlertaModal(errorMessage, 'error');
    } finally {
      this.loadingAction = false;
    }
  }

  async eliminarReporte(reporte: Report): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte?')) return;

    try {
      this.loadingAction = true;
      const response = await this.reportService
        .deleteReport(reporte.id!)
        .toPromise();

      if (response?.success) {
        this.mostrarAlerta('Reporte eliminado exitosamente', 'success');
        await Promise.all([this.loadReports(), this.loadReportStats()]);

        await this.actualizarGraficaConRango();
      }
    } catch (error) {
      this.mostrarAlerta('Error al eliminar el reporte', 'error');
    } finally {
      this.loadingAction = false;
    }
  }

  abrirModalGasto(gasto?: Gasto): void {
    this.mostrarModalGasto = true;
    if (gasto) {
      this.modoEdicionGasto = true;
      this.gastoEditando = gasto;
      this.nuevoGasto = {
        fecha: this.formatearFechaParaInput(gasto.fecha),
        descripcion: gasto.descripcion,
        comentarios: gasto.comentarios || '',
        total: gasto.total,
      };
    } else {
      this.modoEdicionGasto = false;
      this.gastoEditando = null;
      this.nuevoGasto = this.resetNuevoGasto();
    }
  }

  cerrarModalGasto(): void {
    this.mostrarModalGasto = false;
    this.modoEdicionGasto = false;
    this.gastoEditando = null;
    this.nuevoGasto = this.resetNuevoGasto();
    this.cerrarAlertaModalGasto();
  }

  async guardarGasto(): Promise<void> {
    if (!this.validarFormularioGasto()) {
      return;
    }

    try {
      this.loadingAction = true;
      let response;

      const now = moment();
      const fechaGastoMoment = moment(this.nuevoGasto.fecha, 'YYYY-MM-DD')
        .hour(now.hour())
        .minute(now.minute())
        .second(now.second());
      const gastoData = {
        fecha: fechaGastoMoment.format('YYYY-MM-DDTHH:mm:ss'),
        descripcion: this.nuevoGasto.descripcion,
        comentarios: this.nuevoGasto.comentarios || '',
        total: this.nuevoGasto.total,
      };

      if (this.modoEdicionGasto && this.gastoEditando) {
        if (!this.gastoEditando._id) {
          this.mostrarAlertaModalGasto(
            'Error: No se puede actualizar el gasto porque no tiene ID',
            'error'
          );
          return;
        }
        response = await this.gastoService
          .updateGasto(this.gastoEditando._id, gastoData)
          .toPromise();
      } else {
        response = await this.gastoService
          .createGasto(gastoData as Omit<Gasto, 'id'>)
          .toPromise();
      }

      if (response?.success) {
        this.mostrarAlerta(
          this.modoEdicionGasto
            ? 'Gasto actualizado exitosamente'
            : 'Gasto creado exitosamente',
          'success'
        );
        this.cerrarModalGasto();
        await Promise.all([this.loadGastos(), this.loadGastoStats()]);
        await this.actualizarGraficaConRango();
      } else {
        this.mostrarAlertaModalGasto(
          'Error al guardar el gasto: ' +
            (response?.message || 'Error desconocido'),
          'error'
        );
      }
    } catch (error: any) {
      const errorMessage =
        error?.error?.message || error?.message || 'Error al guardar el gasto';
      this.mostrarAlertaModalGasto(errorMessage, 'error');
    } finally {
      this.loadingAction = false;
    }
  }

  async eliminarGasto(gasto: Gasto): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

    try {
      this.loadingAction = true;

      if (!gasto._id) {
        this.mostrarAlerta(
          'Error: No se puede eliminar el gasto porque no tiene ID',
          'error'
        );
        return;
      }

      const response = await this.gastoService
        .deleteGasto(gasto._id)
        .toPromise();

      if (response?.success) {
        this.mostrarAlerta('Gasto eliminado exitosamente', 'success');
        await Promise.all([this.loadGastos(), this.loadGastoStats()]);

        await this.actualizarGraficaConRango();
      }
    } catch (error) {
      this.mostrarAlerta('Error al eliminar el gasto', 'error');
    } finally {
      this.loadingAction = false;
    }
  }

  validarFormularioGasto(): boolean {
    this.cerrarAlertaModalGasto();

    if (!this.nuevoGasto.fecha?.trim()) {
      this.mostrarAlertaModalGasto('La fecha es requerida', 'error');
      return false;
    }

    if (!this.nuevoGasto.descripcion?.trim()) {
      this.mostrarAlertaModalGasto('La descripción es requerida', 'error');
      return false;
    }

    if (this.nuevoGasto.descripcion.trim().length < 1) {
      this.mostrarAlertaModalGasto(
        'La descripción debe tener al menos 1 carácter',
        'error'
      );
      return false;
    }

    if (
      this.nuevoGasto.total === undefined ||
      this.nuevoGasto.total === null ||
      this.nuevoGasto.total < 0
    ) {
      this.mostrarAlertaModalGasto(
        'El total debe ser mayor o igual a 0',
        'error'
      );
      return false;
    }

    return true;
  }

  async aplicarFiltrosGasto(): Promise<void> {
    if (this.paginationGastos) {
      this.paginationGastos.currentPage = 1;
    }
    await this.loadGastos();
    await this.loadGastoStats();
    await this.actualizarGraficaConRango();
  }

  limpiarFiltrosGasto(): void {
    this.filtroDescripcion = '';
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.fechaFinGasto = hoy.toISOString().split('T')[0];
    this.fechaInicioGasto = primerDiaMes.toISOString().split('T')[0];

    this.aplicarFiltrosGasto();
  }

  irAPaginaGasto(pagina: number): void {
    if (
      this.paginationGastos &&
      pagina >= 1 &&
      pagina <= this.paginationGastos.totalPages
    ) {
      this.paginationGastos.currentPage = pagina;
      this.loadGastos();
    }
  }

  paginaAnteriorGasto(): void {
    if (this.paginationGastos && this.paginationGastos.currentPage > 1) {
      this.paginationGastos.currentPage--;
      this.loadGastos();
    }
  }

  paginaSiguienteGasto(): void {
    if (
      this.paginationGastos &&
      this.paginationGastos.currentPage < this.paginationGastos.totalPages
    ) {
      this.paginationGastos.currentPage++;
      this.loadGastos();
    }
  }

  get paginasArrayGasto(): number[] {
    if (!this.paginationGastos) return [];
    const paginas = [];
    for (let i = 1; i <= this.paginationGastos.totalPages; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  mostrarAlertaModalGasto(mensaje: string, tipo: 'success' | 'error'): void {
    this.modalAlertMessageGasto = mensaje;
    this.modalAlertTypeGasto = tipo;

    setTimeout(() => {
      this.modalAlertMessageGasto = '';
      this.modalAlertTypeGasto = '';
    }, 5000);
  }

  cerrarAlertaModalGasto(): void {
    this.modalAlertMessageGasto = '';
    this.modalAlertTypeGasto = '';
  }

  formatearMoneda(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  }

  formatearFecha(fecha: string): string {
    return moment.utc(fecha).format('DD/MM/YYYY');
  }

  formatearFechaParaInput(fecha: string | Date): string {
    return moment.utc(fecha).format('YYYY-MM-DDTHH:mm');
  }

  tieneCupon(comentario: string): boolean {
    if (!comentario) return false;

    const palabrasCupon = ['cup', 'cupon', 'cupón'];
    const comentarioLower = comentario.toLowerCase();

    return palabrasCupon.some((palabra) => comentarioLower.includes(palabra));
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'entregado':
        return 'bg-green-100 text-green-800';
      case 'en-transito':
        return 'bg-blue-100 text-blue-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'entregado':
        return 'Entregado';
      case 'en-transito':
        return 'En Tránsito';
      case 'pendiente':
        return 'Pendiente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  async loadMetricasMesAnterior(): Promise<void> {
    try {
      this.hayDatosMesAnterior = false;

      const mesAnterior = moment().subtract(1, 'month');
      const inicioMesAnterior =
        mesAnterior.clone().startOf('month').format('YYYY-MM-DDTHH:mm:ss.SSS') +
        'Z';
      const finMesAnterior =
        mesAnterior.clone().endOf('month').format('YYYY-MM-DDTHH:mm:ss.SSS') +
        'Z';

      this.resumenMesAnterior = {
        mes: mesAnterior.format('MMMM'),
        anio: mesAnterior.year(),
        inversion: 0,
        ganancias: 0,
        gastos: 0,
        total: 0,
      };

      const filtersReportes = {
        fechaDesde: inicioMesAnterior,
        fechaHasta: finMesAnterior,
      };

      const reportStatsResponse = await this.reportService
        .getReportStats(filtersReportes)
        .toPromise();
      const filtersGastos = {
        fechaDesde: inicioMesAnterior,
        fechaHasta: finMesAnterior,
      };

      const gastoStatsResponse = await this.gastoService
        .getGastoStats(filtersGastos)
        .toPromise();
      let hayReportesAnteriores = false;
      let hayGastosAnteriores = false;

      if (reportStatsResponse?.success && reportStatsResponse.data.statistics) {
        this.metricasMesAnterior.totalPaquetes =
          reportStatsResponse.data.statistics.totalReports || 0;
        this.metricasMesAnterior.dineroInvertido =
          reportStatsResponse.data.statistics.totalCosto || 0;
        this.metricasMesAnterior.ganancias =
          reportStatsResponse.data.statistics.totalGanancia || 0;

        this.resumenMesAnterior.inversion =
          this.metricasMesAnterior.dineroInvertido;
        this.resumenMesAnterior.ganancias = this.metricasMesAnterior.ganancias;

        hayReportesAnteriores = this.metricasMesAnterior.totalPaquetes > 0;
      }

      if (gastoStatsResponse?.success && gastoStatsResponse.data) {
        this.metricasMesAnterior.gastos =
          gastoStatsResponse.data.totalGastado || 0;
        this.resumenMesAnterior.gastos = this.metricasMesAnterior.gastos;

        hayGastosAnteriores = this.metricasMesAnterior.gastos > 0;
      }

      this.metricasMesAnterior.total =
        this.metricasMesAnterior.ganancias - this.metricasMesAnterior.gastos;
      this.resumenMesAnterior.total = this.metricasMesAnterior.total;

      this.hayDatosMesAnterior = hayReportesAnteriores || hayGastosAnteriores;
    } catch (error) {
      this.metricasMesAnterior = {
        totalPaquetes: 0,
        dineroInvertido: 0,
        ganancias: 0,
        gastos: 0,
        total: 0,
      };
      this.hayDatosMesAnterior = false;
    }
  }

  resetNuevoReporte(): Partial<Report> {
    return this.getDefaultReport();
  }

  resetNuevoGasto(): Partial<Gasto> {
    return this.getDefaultGasto();
  }

  mostrarAlerta(mensaje: string, tipo: 'success' | 'error'): void {
    this.alertMessage = mensaje;
    this.alertType = tipo;

    setTimeout(() => {
      this.alertMessage = '';
      this.alertType = '';
    }, 5000);
  }

  cerrarAlerta(): void {
    this.alertMessage = '';
    this.alertType = '';
  }

  mostrarAlertaModal(mensaje: string, tipo: 'success' | 'error'): void {
    this.modalAlertMessage = mensaje;
    this.modalAlertType = tipo;

    setTimeout(() => {
      this.modalAlertMessage = '';
      this.modalAlertType = '';
    }, 5000);
  }

  cerrarAlertaModal(): void {
    this.modalAlertMessage = '';
    this.modalAlertType = '';
  }

  validarFormulario(): boolean {
    this.cerrarAlertaModal();

    if (!this.nuevoReporte.fechaPedido?.trim()) {
      this.mostrarAlertaModal('La fecha del pedido es requerida', 'error');
      return false;
    }

    if (!this.nuevoReporte.destinatario?.trim()) {
      this.mostrarAlertaModal('El destinatario es requerido', 'error');
      return false;
    }

    if (
      !this.nuevoReporte.ubicacionEntrega?.trim() ||
      this.nuevoReporte.ubicacionEntrega.trim().length < 1
    ) {
      this.mostrarAlertaModal(
        'La ubicación de entrega debe tener al menos 1 carácter',
        'error'
      );
      return false;
    }

    if (!this.nuevoReporte.estado?.trim()) {
      this.mostrarAlertaModal('El estado es requerido', 'error');
      return false;
    }

    if (
      this.nuevoReporte.costo === undefined ||
      this.nuevoReporte.costo === null ||
      this.nuevoReporte.costo < 0
    ) {
      this.mostrarAlertaModal('El costo debe ser mayor o igual a 0', 'error');
      return false;
    }

    if (
      this.nuevoReporte.ganancia === undefined ||
      this.nuevoReporte.ganancia === null ||
      this.nuevoReporte.ganancia < 0
    ) {
      this.mostrarAlertaModal(
        'La ganancia debe ser mayor o igual a 0 (puede ser 0 si no hay ganancia)',
        'error'
      );
      return false;
    }

    return true;
  }

  updateTotals(): void {
    this.metricas.total = this.metricas.ganancias - this.metricas.gastos;
    this.updateMetricCardColors();
  }

  updateMetricCardColors(): void {
    const totalCard = document.getElementById('tarjeta-total');
    const totalValue = document.getElementById('valor-total');

    if (totalCard && totalValue) {
      if (this.metricas.total < 0) {
        totalCard.classList.remove('border-indigo-500');
        totalCard.classList.add('border-red-500');
        totalValue.classList.remove('text-indigo-600');
        totalValue.classList.add('text-red-600');
      } else {
        totalCard.classList.remove('border-red-500');
        totalCard.classList.add('border-indigo-500');
        totalValue.classList.remove('text-red-600');
        totalValue.classList.add('text-indigo-600');
      }
    }
  }

  getResumenMesAnterior(): string {
    if (!this.resumenMesAnterior.mes) {
      return '';
    }

    const formatMoneda = (valor: number) =>
      `$${valor.toLocaleString('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;

    return `En ${this.resumenMesAnterior.mes} ${
      this.resumenMesAnterior.anio
    }: inversión ${formatMoneda(
      this.resumenMesAnterior.inversion
    )}, ganancias ${formatMoneda(
      this.resumenMesAnterior.ganancias
    )}, gastos ${formatMoneda(
      this.resumenMesAnterior.gastos
    )}, total ${formatMoneda(this.resumenMesAnterior.total)}`;
  }
}
