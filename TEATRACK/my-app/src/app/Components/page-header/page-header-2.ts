import { Component, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, HostListener, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';

const CART_KEY = 'cart_items';
const USER_KEY = 'ngogia_user';

@Component({
  selector: 'app-page-header-2',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './page-header-2.html',
  styleUrl: './page-header.css',
})
export class PageHeader2 implements AfterViewInit, OnDestroy {
  userMenuOpen = false;
  showLogoutModal = false;
  avatarSrc = 'assets/icons/user.png';
  private cartUpdatedHandler = () => this.updateCartBadge();
  private userUpdatedHandler = () => this.updateUserInfo();

  @ViewChild('userBox') userBoxRef?: ElementRef<HTMLElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  /** Username từ ngogia_user (đăng nhập/đăng ký), hiển thị thay "Tài khoản" */
  get userName(): string {
    if (!isPlatformBrowser(this.platformId)) return 'Tài khoản';
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

    // Cập nhật giỏ hàng và thông tin user lần đầu
    this.updateCartBadge();
    this.updateUserInfo();

    // Lắng nghe sự kiện cập nhật
    if (typeof window !== 'undefined') {
      window.addEventListener('cart:updated', this.cartUpdatedHandler);
      window.addEventListener('user:updated', this.userUpdatedHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart:updated', this.cartUpdatedHandler);
      window.removeEventListener('user:updated', this.userUpdatedHandler);
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
    }
    this.showLogoutModal = false;
    window.location.href = '/login';
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

  private updateUserInfo(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) {
        const user = JSON.parse(raw) as { avatar?: string; username?: string; name?: string };

        // Cập nhật avatar
        if (user.avatar) {
          const apiBaseUrl = 'http://localhost:3002'; // Nên chuyển vào environment
          if (user.avatar.startsWith('/uploads')) {
            this.avatarSrc = apiBaseUrl + user.avatar;
          } else {
            this.avatarSrc = user.avatar;
          }
        } else {
          this.avatarSrc = 'assets/icons/user.png';
        }

        // Trigger change detection để cập nhật giao diện
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Lỗi cập nhật thông tin user:', error);
    }
  }
}