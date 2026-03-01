import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderTracking } from './order-tracking';

describe('OrderTracking', () => {
  let component: OrderTracking;
  let fixture: ComponentFixture<OrderTracking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrderTracking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderTracking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
