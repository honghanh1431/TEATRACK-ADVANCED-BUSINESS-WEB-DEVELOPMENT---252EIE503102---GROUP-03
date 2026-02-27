import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registion } from './registion';

describe('Registion', () => {
  let component: Registion;
  let fixture: ComponentFixture<Registion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Registion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Registion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
