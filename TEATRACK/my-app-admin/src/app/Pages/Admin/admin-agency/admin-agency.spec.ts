import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAgency } from './admin-agency';

describe('AdminAgency', () => {
  let component: AdminAgency;
  let fixture: ComponentFixture<AdminAgency>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminAgency]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminAgency);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
