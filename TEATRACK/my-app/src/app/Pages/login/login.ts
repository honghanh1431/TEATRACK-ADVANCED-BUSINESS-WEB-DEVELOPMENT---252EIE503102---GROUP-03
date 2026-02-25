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

  isAdmin = false;
  username = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  showErrorModal = false;

  // i18n
  currentLang = 'vi';
  t: any = {};

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.isAdmin = data['isAdmin'] === true;
    });

    // Load ngôn ngữ đã lưu hoặc mặc định vi
    const savedLang = localStorage.getItem('lang') || 'vi';
    this.loadLang(savedLang);
  }

  loadLang(lang: string): void {
  this.currentLang = lang;
  localStorage.setItem('lang', lang);
  this.http.get(`/lang/${lang}.json`).subscribe({
    next: (data) => { 
      console.log('Loaded lang:', lang, data); // thêm dòng này
      this.t = data; 
      this.currentLang = lang;
    },
    error: () => { console.warn('Không load được file ngôn ngữ'); }
  });
}

  setLang(lang: string): void {
    this.loadLang(lang);
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
      this.showError(this.currentLang === 'vi'
        ? 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
        : 'Please enter your username and password.');
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
          this.showError(this.currentLang === 'vi'
            ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
            : 'Incorrect username or password.');
          return;
        }

        if (this.isAdmin && user.role !== 'admin') {
          this.showError(this.currentLang === 'vi'
            ? 'Tài khoản này không có quyền quản lý.'
            : 'This account does not have admin access.');
          return;
        }

        if (!this.isAdmin && user.role !== 'customer') {
          this.showError(this.currentLang === 'vi'
            ? 'Vui lòng đăng nhập tại trang quản lý.'
            : 'Please login at the admin page.');
          return;
        }

        localStorage.setItem('ngogia_user', JSON.stringify(user));
        if (this.isAdmin) {
          localStorage.setItem('authAdmin', '1');
          window.location.href = '/admin-dashboard';
        } else {
          window.location.href = '/home';
        }
      },
      error: () => {
        this.isLoading = false;
        this.showError(this.currentLang === 'vi'
          ? 'Không thể đọc dữ liệu. Vui lòng thử lại.'
          : 'Cannot load data. Please try again.');
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onLogin();
  }
}