export interface ErroresContexto {
  mensaje403?: string;
  mensaje404?: string;
}

export function leerStatusHttp(err: unknown): number {
  if (!err || typeof err !== 'object') {
    return 0;
  }
  const objeto = err as { status?: unknown };
  return typeof objeto.status === 'number' ? objeto.status : 0;
}

export function leerDetailHttp(err: unknown): string | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const objeto = err as { error?: { detail?: unknown } };
  const detail = objeto.error?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const primero = detail[0] as { msg?: unknown } | undefined;
    if (primero && typeof primero.msg === 'string' && primero.msg.trim()) {
      return primero.msg;
    }
  }

  return null;
}

export function esError401(err: unknown): boolean {
  return leerStatusHttp(err) === 401;
}

export function mensajeErrorHttp(
  err: unknown,
  contexto?: ErroresContexto,
): string {
  const detail = leerDetailHttp(err);
  if (detail) {
    return detail;
  }

  switch (leerStatusHttp(err)) {
    case 400:
      return 'La solicitud enviada no es válida.';
    case 401:
      return 'Tu sesión ha expirado o no has iniciado sesión.';
    case 403:
      return (
        contexto?.mensaje403 ??
        'No tienes permisos para configurar la disponibilidad.'
      );
    case 404:
      return (
        contexto?.mensaje404 ??
        'El oftalmólogo, horario o bloqueo solicitado no fue encontrado.'
      );
    case 409:
      return 'La operación no pudo completarse por un conflicto con los datos existentes.';
    case 422:
      return 'Algunos datos enviados no son válidos. Revisa los campos del formulario.';
    case 500:
      return 'Ocurrió un error en el servidor.';
    case 0:
      return 'No se pudo conectar con el servidor.';
    default:
      return 'Ocurrió un error inesperado.';
  }
}
