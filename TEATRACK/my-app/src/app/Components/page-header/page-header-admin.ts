import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-page-header-admin',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './page-header-admin.html',
  styleUrl: './page-header.css',
})
export class PageHeaderAdmin {
  userMenuOpen = false;

  @ViewChild('userBox') userBoxRef?: ElementRef<HTMLElement>;

  /** Username từ authAdmin hoặc ngogia_user (đăng nhập manager) */
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
    } catch {}
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
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      localStorage.removeItem('authAdmin');
      localStorage.removeItem('ngogia_user');
      localStorage.removeItem('cart_items');
      localStorage.removeItem('ngogia_shipping');
      localStorage.removeItem('ngogia_coupon');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:updated'));
      }
      window.location.href = '/login-admin';
    }
  }
}
