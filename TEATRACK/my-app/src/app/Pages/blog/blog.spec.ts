import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Blog } from './blog';

describe('Blog', () => {
  let component: Blog;
  let fixture: ComponentFixture<Blog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Blog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Blog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
