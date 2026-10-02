import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionServicios } from './gestion-servicios';

describe('GestionServicios', () => {
  let component: GestionServicios;
  let fixture: ComponentFixture<GestionServicios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionServicios],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionServicios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
