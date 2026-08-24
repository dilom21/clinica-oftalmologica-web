import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuModulo } from '../models/menu.models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly menuUrl = `${environment.apiUrl}/seguridad/menu`;

  constructor(private readonly http: HttpClient) {}

  obtenerMenu(): Observable<MenuModulo[]> {
    return this.http.get<MenuModulo[]>(this.menuUrl);
  }
}
