import { Component, HostListener, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-page-header-admin',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './page-header-admin.html',
  styleUrl: './page-header.css',
})
export class PageHeaderAdmin implements OnInit, OnDestroy, AfterViewInit {
  userMenuOpen = false;
  showLogoutModal = false;
  isOverviewNavActive = false;
  isProductsNavActive = false;
  adminName = 'Tài khoản';
  adminAvatar = 'assets/icons/user.png';

  private socket?: Socket;
  private routerSub?: Subscription;
  private hashSub?: () => void;

  @ViewChild('userBox') userBoxRef?: ElementRef<HTMLElement>;
  @ViewChild('navBar') navBarRef?: ElementRef<HTMLElement>;

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef, private ngZone: NgZone) {
    this.socket = io('http://localhost:3002');
  }

  private updateProductsActive(): void {
    const onDashboard = this.router.url.split('?')[0].includes('admin-dashboard');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    this.isProductsNavActive = onDashboard && hash === '#products';
    this.isOverviewNavActive = onDashboard && hash !== '#products';
  }

  scrollActiveNavIntoView(): void {
    setTimeout(() => {
      const nav = this.navBarRef?.nativeElement;
      if (!nav) return;
      const active = nav.querySelector('a.active');
      if (active instanceof HTMLElement) {
        active.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' });
      }
    }, 0);
  }

  ngOnInit(): void {
    // Defer loadUserData to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.loadUserData(), 0);
    this.updateProductsActive();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateProductsActive();
        this.scrollActiveNavIntoView();
      });
    if (typeof window !== 'undefined') {
      this.hashSub = () => {
        this.updateProductsActive();
        this.scrollActiveNavIntoView();
      };
      window.addEventListener('hashchange', this.hashSub);
      window.addEventListener('user:updated', () => {
        this.ngZone.run(() => {
          this.loadUserData();
          this.refreshAdminProfile();
        });
      });
    }
    this.socket?.on('userUpdated', (data: any) => {
      this.ngZone.run(() => {
        const adminRaw = localStorage.getItem('authAdmin');
        if (adminRaw) {
          const admin = JSON.parse(adminRaw);
          if (data && data.userId === admin._id) {
            this.refreshAdminProfile();
          }
        }
      });
    });
  }

  loadUserData(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const adminRaw = localStorage.getItem('authAdmin');
      const userRaw = localStorage.getItem('ngogia_user');
      let targetUser: any = null;

      if (adminRaw) targetUser = JSON.parse(adminRaw);
      else if (userRaw) targetUser = JSON.parse(userRaw);

      if (targetUser) {
        this.adminName = (targetUser.username || targetUser.name || 'Tài khoản').trim();
        this.adminAvatar = this.normSrc(targetUser.avatar);
      } else {
        this.adminName = 'Tài khoản';
        this.adminAvatar = 'assets/icons/user.png';
      }
    } catch {
      this.adminName = 'Tài khoản';
      this.adminAvatar = 'assets/icons/user.png';
    }
    this.cdr.detectChanges();
  }

  refreshAdminProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.http.get<any>('http://localhost:3002/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const user = res.user;
        localStorage.setItem('authAdmin', JSON.stringify(user));
        localStorage.setItem('ngogia_user', JSON.stringify(user));
        this.loadUserData();
      },
      error: (err) => console.error('Failed to refresh admin profile', err)
    });
  }

  ngAfterViewInit(): void {
    this.scrollActiveNavIntoView();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (typeof window !== 'undefined' && this.hashSub) {
      window.removeEventListener('hashchange', this.hashSub);
    }
  }


  normSrc(path?: string): string {
    if (!path) return 'assets/icons/user.png';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const apiBaseUrl = 'http://localhost:3002';
    if (path.startsWith('/uploads')) return apiBaseUrl + path;
    return path;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const box = this.userBoxRef?.nativeElement;
    if (box && !box.contains(target)) {
      this.userMenuOpen = false;
    }
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.closeUserMenu();
    this.showLogoutModal = true;
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    localStorage.removeItem('authAdmin');
    localStorage.removeItem('ngogia_user');
    localStorage.removeItem('token');
    localStorage.removeItem('cart_items');
    localStorage.removeItem('ngogia_shipping');
    localStorage.removeItem('ngogia_coupon');
    // Reset avatar về mặc định ngay lập tức để tránh broken image
    this.adminAvatar = 'assets/icons/user.png';
    this.adminName = 'Tài khoản';
    this.cdr.detectChanges();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'));
      window.dispatchEvent(new CustomEvent('user:logout'));
    }
    this.showLogoutModal = false;
    this.router.navigate(['/login']);
  }
}
