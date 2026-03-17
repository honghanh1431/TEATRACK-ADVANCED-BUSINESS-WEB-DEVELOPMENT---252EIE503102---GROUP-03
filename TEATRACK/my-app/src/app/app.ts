import { Component, HostBinding, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ROUTE_TITLES, APP_TITLE_SUFFIX, getRouteTitle } from './route-titles';
import { CartService } from './cart.service';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private sub?: Subscription;
  private toastSub?: Subscription;
  private socket: Socket | undefined;

  showLayout = true;
  /** 'guest' = page-header, 'customer' = page-header-2 */
  headerMode: 'guest' | 'customer' = 'guest';
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
        // Ưu tiên role trong ngogia_user: customer → header-2
        if (user?.role === 'customer') {
          this.headerMode = 'customer';
          return;
        }
        // Có user nhưng không rõ role (cũ) → coi là customer
        this.headerMode = 'customer';
        return;
      }
    } catch (_) { }
    this.headerMode = 'guest';
  }

  /** Màu nền dải phía trên footer: thống nhất cho tất cả giao diện customer */
  @HostBinding('style.--footer-overlap-bg') get footerOverlapBg(): string {
    return '#f6f9ff';
  }

  private logoutHandler = () => {
    this.updateHeaderMode();
    this.cdr.detectChanges();
  };

  constructor(
    private router: Router,
    private titleService: Title,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    console.log('App: Initializing Socket.io connection to http://localhost:3002');
    this.socket = io('http://localhost:3002');
    
    this.socket.on('connect', () => {
      console.log('App: Socket connected!', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('App: Socket connection error:', error);
    });

    this.socket.on('userUpdated', (data: any) => {
      console.log('Socket: userUpdated received', data);
      try {
        const userRaw = localStorage.getItem('ngogia_user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          const currentId = user._id || user.id;
          console.log('Current logged in user ID:', currentId);
          // Check if the current user is the one that got updated
          if (data && data.userId && String(currentId) === String(data.userId)) {
            console.log('Matched! Refreshing profile...');
            this.refreshUserProfile();
          }
        }
      } catch (err) {
        console.error('Error handling userUpdated event:', err);
      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const path = event.urlAfterRedirects?.split('?')[0] || '';
        this.showLayout = !this.hideLayoutPaths.includes(path);
        this.updateHeaderMode();
        this.cdr.detectChanges();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('routeChange', { detail: { path: path } }));
        }
      }
    });
  }

  private updateTitle(path: string): void {
    if (/^\/blog\/[^/]+$/.test(path)) return;
    if (path === '/product' || path.startsWith('/product/') || path.startsWith('/menu/product/')) return;
    const lang = (typeof localStorage !== 'undefined' && (localStorage.getItem('lang') === 'en' ? 'en' : 'vi')) as 'vi' | 'en';
    const pageTitle = getRouteTitle(path, lang) || ROUTE_TITLES[path];
    const full = pageTitle ? `${pageTitle} | ${APP_TITLE_SUFFIX}` : APP_TITLE_SUFFIX;
    this.titleService.setTitle(full);
  }

  private readonly hideLayoutPaths = ['/login', '/register', '/404', '/payment', '/forgot-password'];


  ngOnInit(): void {
    const path = (this.router.url || '').split('?')[0];
    this.showLayout = !this.hideLayoutPaths.includes(path);
    this.updateHeaderMode();
    this.updateTitle(path || '/');
    this.refreshUserProfile();
    if (typeof window !== 'undefined') {
      window.addEventListener('user:logout', this.logoutHandler);
    }
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

  private refreshUserProfile(): void {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ user: any }>('http://localhost:3002/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res && res.user) {
          localStorage.setItem('ngogia_user', JSON.stringify(res.user));
          this.updateHeaderMode();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user:updated'));
          }
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('user:logout', this.logoutHandler);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    this.sub?.unsubscribe();
    this.toastSub?.unsubscribe();
  }
}
