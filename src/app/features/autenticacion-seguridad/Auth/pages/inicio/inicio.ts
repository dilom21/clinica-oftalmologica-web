import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Sidebar } from '../../../../../core/layouts/sidebar/sidebar';
import { MenuService } from '../../../../../core/services/menu.service';
import { NavegacionService } from '../../../../../core/services/navegacion.service';
import { PerfilUsuario } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';

/** Tarjeta de acceso rápido del inicio. */
interface TarjetaAcceso {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: string;
  /** Etiqueta corta para los botones del hero (solo en las destacadas). */
  accion?: string;
}

/**
 * Inicio / panel de bienvenida del sistema.
 *
 * No muestra métricas inventadas: los accesos se construyen a partir de las
 * funciones que el backend habilita para el rol autenticado, y la identidad
 * se deriva de la sesión real.
 */
@Component({
  selector: 'app-inicio',
  imports: [Sidebar, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly navegacion = inject(NavegacionService);

  protected readonly sidebarMovilAbierto = signal(false);
  protected readonly perfil = signal<PerfilUsuario | null>(null);

  protected readonly cargandoMenu = this.menuService.cargando;
  protected readonly menuError = this.menuService.error;

  /** Catálogo de accesos disponibles; se filtra por permisos reales. */
  private readonly catalogo: ReadonlyArray<TarjetaAcceso> = [
    {
      ruta: '/pacientes',
      titulo: 'Pacientes',
      descripcion: 'Consulta y administra la información de los pacientes.',
      icono: 'pacientes',
      accion: 'Ver pacientes',
    },
    {
      ruta: '/registrar-consulta-clinica',
      titulo: 'Registrar consulta',
      descripcion: 'Inicia una nueva atención clínica del paciente.',
      icono: 'consulta',
      accion: 'Registrar consulta',
    },
    {
      ruta: '/historial-clinico',
      titulo: 'Historial clínico',
      descripcion: 'Consulta consultas, diagnósticos y plan terapéutico.',
      icono: 'historial',
      accion: 'Ver historial',
    },
    {
      ruta: '/gestionar-citas',
      titulo: 'Agenda y citas',
      descripcion: 'Organiza, agenda y reprograma las citas médicas.',
      icono: 'citas',
      accion: 'Gestionar citas',
    },
    {
      ruta: '/agenda-disponibilidad',
      titulo: 'Disponibilidad médica',
      descripcion: 'Consulta la agenda y los horarios disponibles.',
      icono: 'disponibilidad',
    },
    {
      ruta: '/registrar-diagnostico',
      titulo: 'Diagnósticos',
      descripcion: 'Registra diagnósticos asociados a una consulta.',
      icono: 'diagnostico',
    },
    {
      ruta: '/tratamientos-recetas',
      titulo: 'Tratamientos y recetas',
      descripcion: 'Gestiona el plan terapéutico y las prescripciones.',
      icono: 'tratamiento',
    },
    {
      ruta: '/examenes-oftalmologicos',
      titulo: 'Exámenes oftalmológicos',
      descripcion: 'Registra estudios y sus resultados por consulta.',
      icono: 'examen',
    },
    {
      ruta: '/historial-citas',
      titulo: 'Historial de citas',
      descripcion: 'Revisa las citas atendidas y su estado.',
      icono: 'citas',
    },
    {
      ruta: '/configurar-disponibilidad',
      titulo: 'Configurar disponibilidad',
      descripcion: 'Define tu horario de atención y tus turnos.',
      icono: 'ajustes',
    },
    {
      ruta: '/usuarios',
      titulo: 'Usuarios',
      descripcion: 'Gestiona las cuentas del personal del centro.',
      icono: 'usuarios',
    },
    {
      ruta: '/roles',
      titulo: 'Roles y permisos',
      descripcion: 'Administra roles y el acceso a las funciones.',
      icono: 'roles',
    },
    {
      ruta: '/bitacora',
      titulo: 'Bitácora del sistema',
      descripcion: 'Consulta la actividad registrada en el sistema.',
      icono: 'bitacora',
    },
  ];

  private readonly rutasAutorizadas = computed<ReadonlySet<string>>(() => {
    const rutas = new Set<string>();
    for (const modulo of this.menuService.modulos()) {
      for (const funcion of modulo.funciones ?? []) {
        if (this.navegacion.estaOcultaEnWeb(funcion.nombre)) {
          continue;
        }
        const ruta = this.navegacion.rutaDeFuncion(funcion.nombre);
        if (ruta) {
          rutas.add(ruta);
        }
      }
    }
    return rutas;
  });

  /** Tarjetas visibles: solo rutas realmente habilitadas para el rol. */
  protected readonly tarjetas = computed<ReadonlyArray<TarjetaAcceso>>(() =>
    this.catalogo.filter((tarjeta) => this.rutasAutorizadas().has(tarjeta.ruta)),
  );

  /** Botones del hero: los accesos destacados que el rol tiene permitidos. */
  protected readonly accionesHero = computed<ReadonlyArray<TarjetaAcceso>>(() =>
    this.tarjetas()
      .filter((tarjeta) => !!tarjeta.accion)
      .slice(0, 2),
  );

  /** Módulos habilitados con el número de funciones web disponibles. */
  protected readonly modulosHabilitados = computed(() =>
    this.menuService
      .modulos()
      .map((modulo) => ({
        id: modulo.id,
        nombre: modulo.nombre,
        totalFunciones: (modulo.funciones ?? []).filter(
          (funcion) => !this.navegacion.estaOcultaEnWeb(funcion.nombre),
        ).length,
      }))
      .filter((modulo) => modulo.totalFunciones > 0),
  );

  protected readonly saludo = computed(() => this.calcularSaludo(new Date().getHours()));
  protected readonly nombreMostrar = computed(
    () => this.perfil()?.nombreMostrar ?? 'Bienvenido',
  );
  protected readonly rolNombre = computed(() => this.perfil()?.rolNombre ?? 'Usuario');
  protected readonly iniciales = computed(() => this.perfil()?.iniciales ?? 'US');
  protected readonly correo = computed(() => this.perfil()?.correo ?? null);

  ngOnInit(): void {
    this.perfil.set(this.authService.obtenerPerfilActual());
    this.menuService.cargar();
  }

  protected alternarSidebar(): void {
    this.sidebarMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarSidebar(): void {
    this.sidebarMovilAbierto.set(false);
  }

  protected reintentarMenu(): void {
    this.menuService.reintentar();
  }

  private calcularSaludo(hora: number): string {
    if (hora < 12) {
      return 'Buenos días';
    }
    if (hora < 19) {
      return 'Buenas tardes';
    }
    return 'Buenas noches';
  }
}
