import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

const CART_KEY = 'cart_items';
const USER_KEY = 'ngogia_user';

@Component({
  selector: 'app-page-header-2',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './page-header-2.html',
  styleUrl: './page-header.css',
})
export class PageHeader2 implements AfterViewInit, OnDestroy {
  userMenuOpen = false;
  private cartUpdatedHandler = () => this.updateCartBadge();

  @ViewChild('userBox') userBoxRef?: ElementRef<HTMLElement>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /** Username từ ngogia_user (đăng nhập/đăng ký), hiển thị thay "Tài khoản" */
  get userName(): string {
    if (typeof localStorage === 'undefined') return 'Tài khoản';
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return 'Tài khoản';
      const user = JSON.parse(raw) as { username?: string; name?: string };
      return (user?.username || user?.name || 'Tài khoản').trim() || 'Tài khoản';
    } catch {
      return 'Tài khoản';
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.updateCartBadge();
    if (typeof window !== 'undefined') {
      window.addEventListener('cart:updated', this.cartUpdatedHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart:updated', this.cartUpdatedHandler);
    }
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
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      localStorage.removeItem('authAdmin');
      localStorage.removeItem('ngogia_user');
      localStorage.removeItem('cart_items');
      localStorage.removeItem('ngogia_shipping');
      localStorage.removeItem('ngogia_coupon');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
      window.location.href = '/';
    }
  }

  private updateCartBadge(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    let count = 0;
    let total = 0;
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const it of arr) {
            const qty = Math.max(0, Number((it as any).qty ?? 1));
            const price = Number((it as any).price ?? 0);
            count += qty;
            total += qty * price;
          }
        }
      }
    } catch (_) {}
    const totalStr = total.toLocaleString('vi-VN') + 'đ';
    document.querySelectorAll('[data-cart-count], #headerCartCount, .header-cart-count').forEach((el) => {
      (el as HTMLElement).textContent = String(count);
    });
    document.querySelectorAll('[data-cart-total], #headerCartTotal, .header-cart-total').forEach((el) => {
      (el as HTMLElement).textContent = totalStr;
    });
  }
}
