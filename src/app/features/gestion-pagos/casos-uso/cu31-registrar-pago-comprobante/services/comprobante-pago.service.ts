import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { nombreArchivoComprobante } from '../models/pagos-administrativos.models';
import { PagosAdministrativosService } from './pagos-administrativos.service';

/**
 * Descarga el PDF auténtico del backend y lo entrega al navegador.
 * No genera comprobantes locales: sólo transporta el binario recibido.
 */
@Injectable({ providedIn: 'root' })
export class ComprobantePagoService {
  private readonly api = inject(PagosAdministrativosService);
  private readonly documento = inject(DOCUMENT);

  descargar(pagoId: number): Observable<void> {
    return this.api.descargarComprobante(pagoId).pipe(
      map((respuesta) => {
        const contenido = respuesta.body;
        if (!contenido || contenido.size === 0) {
          throw new Error('El servidor no devolvió un comprobante PDF.');
        }
        const nombre = nombreArchivoComprobante(
          respuesta.headers.get('Content-Disposition'),
          pagoId,
        );
        this.guardar(contenido, nombre);
      }),
    );
  }

  private guardar(contenido: Blob, nombre: string): void {
    const url = URL.createObjectURL(contenido);
    const enlace = this.documento.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.rel = 'noopener';
    enlace.style.display = 'none';
    this.documento.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
