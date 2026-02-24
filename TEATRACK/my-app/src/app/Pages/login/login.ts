import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  // Mode
  isAdmin = false;

  // Form fields
  username = '';
  password = '';
  rememberMe = false;

  // UI state
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  showErrorModal = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'] === true;
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  closeError(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.showErrorModal = true;
  }

  onLogin(): void {
  const u = this.username.trim();
  const p = this.password.trim();

  if (!u || !p) {
    this.showError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
    return;
  }

  this.isLoading = true;

  this.http.get<any>('/data/login.json').subscribe({
    next: (data) => {
      this.isLoading = false;

      const user = data.users.find(
        (x: any) => x.username === u && x.password === p
      );

      if (!user) {
        this.showError('Tên đăng nhập hoặc mật khẩu không đúng.');
        return;
      }

      // Kiểm tra đúng role chưa
      if (this.isAdmin && user.role !== 'admin') {
        this.showError('Tài khoản này không có quyền quản lý.');
        return;
      }

      if (!this.isAdmin && user.role !== 'customer') {
        this.showError('Vui lòng đăng nhập tại trang quản lý.');
        return;
      }

      // Lưu thông tin và redirect
      localStorage.setItem('ngogia_user', JSON.stringify(user));
      if (this.isAdmin) {
        localStorage.setItem('authAdmin', '1');
        this.router.navigate(['/blog']);
      } else {
        this.router.navigate(['/blog']);
      }
    },
    error: () => {
      this.isLoading = false;
      this.showError('Không thể đọc dữ liệu. Vui lòng thử lại.');
    }
  });
}

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onLogin();
  }
}