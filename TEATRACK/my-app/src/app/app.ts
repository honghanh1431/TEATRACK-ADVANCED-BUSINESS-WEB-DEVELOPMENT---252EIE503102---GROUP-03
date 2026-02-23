import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private sub?: Subscription;

  constructor(
    private router: Router,
    private titleService: Title,
  ) {}

  private updateTitle(path: string): void {
    if (/^\/blog\/[^/]+$/.test(path)) return;
    if (path === '/product' || path.startsWith('/product/') || path.startsWith('/menu/product/')) return;
    const pageTitle = ROUTE_TITLES[path];
    const full = pageTitle ? `${pageTitle} | ${APP_TITLE_SUFFIX}` : APP_TITLE_SUFFIX;
    this.titleService.setTitle(full);
  }

  ngOnInit(): void {
    this.updateTitle((this.router.url || '/').split('?')[0]);
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateTitle((e.urlAfterRedirects || '/').split('?')[0]));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
