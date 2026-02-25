import { Component, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private sub?: Subscription;
  private toastSub?: Subscription;

  showLayout = true;
  /** Toast: pre + name (in đậm) + post */
  toastPre = '';
  toastName = '';
  toastPost = '';
  toastVisible = false;

  /** Màu nền dải phía trên footer: khớp với aboutus/menu để không bị tách màu */
  @HostBinding('style.--footer-overlap-bg') get footerOverlapBg(): string {
    const path = this.router.url.split('?')[0];
    if (path === '/aboutus') return '#f6f9ff';
    if (path === '/menu' || path.startsWith('/menu?')) return '#f3f9fe';
    return '#ffffff';
  }

  constructor(
    private router: Router,
    private titleService: Title,
    private cartService: CartService,
  ) {
    this.router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      const path = event.urlAfterRedirects?.split('?')[0] || '';
      this.showLayout = !this.hideLayoutPaths.includes(path);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('routeChange', { detail: { path: path } }));
      }
    }
  });
  }

  private updateTitle(path: string): void {
    if (/^\/blog\/[^/]+$/.test(path)) return;
    if (path === '/product' || path.startsWith('/product/') || path.startsWith('/menu/product/')) return;
    const pageTitle = ROUTE_TITLES[path];
    const full = pageTitle ? `${pageTitle} | ${APP_TITLE_SUFFIX}` : APP_TITLE_SUFFIX;
    this.titleService.setTitle(full);
  }

  private readonly hideLayoutPaths = ['/login', '/login-admin', '/register', '/404', '/payment'];
  

  ngOnInit(): void {
    const path = (this.router.url || '').split('?')[0];
    this.showLayout = !this.hideLayoutPaths.includes(path);
    this.updateTitle(path || '/');
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateTitle((e.urlAfterRedirects || '/').split('?')[0]));

    (window as any).NGCart = {
      addItem: (item: any) => this.cartService.addItem(item),
    };

    this.toastSub = this.cartService.toastMessage$.subscribe((data) => {
      this.toastPre = data.pre;
      this.toastName = data.name;
      this.toastPost = data.post;
      this.toastVisible = true;
      setTimeout(() => {
        this.toastVisible = false;
        this.toastPre = this.toastName = this.toastPost = '';
      }, 3200);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }
}
