import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPromotion } from './admin-promotion';

describe('AdminPromotion', () => {
  let component: AdminPromotion;
  let fixture: ComponentFixture<AdminPromotion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPromotion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPromotion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
