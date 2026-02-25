import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pagenotfound } from './pagenotfound';

describe('Pagenotfound', () => {
  let component: Pagenotfound;
  let fixture: ComponentFixture<Pagenotfound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Pagenotfound]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pagenotfound);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
