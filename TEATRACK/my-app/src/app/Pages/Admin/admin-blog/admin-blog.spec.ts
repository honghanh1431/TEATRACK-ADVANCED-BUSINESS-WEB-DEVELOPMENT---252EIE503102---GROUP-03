import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBlog } from './admin-blog';

describe('AdminBlog', () => {
  let component: AdminBlog;
  let fixture: ComponentFixture<AdminBlog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminBlog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBlog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
