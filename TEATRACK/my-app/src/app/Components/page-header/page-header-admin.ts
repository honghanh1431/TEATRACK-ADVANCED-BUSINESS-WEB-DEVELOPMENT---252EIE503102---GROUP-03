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
      window.location.href = '/login-admin';
    }
  }
}
