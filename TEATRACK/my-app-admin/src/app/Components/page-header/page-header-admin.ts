import { Component, HostListener, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-page-header-admin',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './page-header-admin.html',
  styleUrl: './page-header.css',
})
export class PageHeaderAdmin implements OnInit, OnDestroy {
  userMenuOpen = false;
  showLogoutModal = false;
  isOverviewNavActive = false;
  isProductsNavActive = false;
  private routerSub?: Subscription;
  private hashSub?: () => void;

  @ViewChild('userBox') userBoxRef?: ElementRef<HTMLElement>;

  constructor(private router: Router) { }

  private updateProductsActive(): void {
    const onDashboard = this.router.url.split('?')[0].includes('admin-dashboard');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    this.isProductsNavActive = onDashboard && hash === '#products';
    this.isOverviewNavActive = onDashboard && hash !== '#products';
  }

  ngOnInit(): void {
    this.updateProductsActive();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateProductsActive());
    if (typeof window !== 'undefined') {
      this.hashSub = () => this.updateProductsActive();
      window.addEventListener('hashchange', this.hashSub);
    }
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (typeof window !== 'undefined' && this.hashSub) {
      window.removeEventListener('hashchange', this.hashSub);
    }
  }

  get userName(): string {
    if (typeof localStorage === 'undefined') return 'Tài khoản';
    try {
      const adminRaw = localStorage.getItem('authAdmin');
      if (adminRaw) {
        const admin = JSON.parse(adminRaw) as { name?: string };
        if (admin?.name) return admin.name.trim();
      }
      const userRaw = localStorage.getItem('ngogia_user');
      if (userRaw) {
        const user = JSON.parse(userRaw) as { username?: string };
        if (user?.username) return user.username.trim();
      }
    } catch { }
    return 'Tài khoản';
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
    localStorage.removeItem('cart_items');
    localStorage.removeItem('ngogia_shipping');
    localStorage.removeItem('ngogia_coupon');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'));
      window.dispatchEvent(new CustomEvent('user:logout'));
    }
    this.showLogoutModal = false;
    this.router.navigate(['/login']);
  }
}
