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
  /** 'guest' = page-header, 'customer' = page-header-2, 'admin' = page-header-admin */
  headerMode: 'guest' | 'customer' | 'admin' = 'guest';
  /** Toast: pre + name (in đậm) + post */
  toastPre = '';
  toastName = '';
  toastPost = '';
  toastVisible = false;

  private updateHeaderMode(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const userRaw = localStorage.getItem('ngogia_user');
      if (userRaw) {
        const user = JSON.parse(userRaw) as { role?: string };
        // Ưu tiên role trong ngogia_user: customer → header-2, admin → header-admin
        if (user?.role === 'customer') {
          this.headerMode = 'customer';
          return;
        }
        if (user?.role === 'admin' && localStorage.getItem('authAdmin')) {
          this.headerMode = 'admin';
          return;
        }
        // Có user nhưng không rõ role (cũ) → coi là customer
        this.headerMode = 'customer';
        return;
      }
      if (localStorage.getItem('authAdmin')) {
        this.headerMode = 'admin';
        return;
      }
    } catch (_) {}
    this.headerMode = 'guest';
  }

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
      this.updateHeaderMode();
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

  private readonly hideLayoutPaths = ['/login', '/login-admin', '/register', '/404'];

  ngOnInit(): void {
    const path = (this.router.url || '').split('?')[0];
    this.showLayout = !this.hideLayoutPaths.includes(path);
    this.updateHeaderMode();
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
