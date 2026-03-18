import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

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
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private title: Title
  ) { }

  ngOnInit(): void {

    // Load ngôn ngữ đã lưu hoặc mặc định vi
    const savedLang = localStorage.getItem('lang') || 'vi';
    this.loadLang(savedLang);
    this.updatePageTitle();
  }

  private updatePageTitle(): void {
    const suffix = 'Hồng trà ngô gia';
    this.title.setTitle(this.currentLang === 'vi' ? `Login | ${suffix}` : `Đăng nhập | ${suffix}`);
  }

  loadLang(lang: string): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.http.get(`/lang/${lang}.json`).subscribe({
      next: (data) => {
        this.t = data;
        this.currentLang = lang;
        this.updatePageTitle();
        this.cdr.detectChanges();
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
        ? 'Vui lòng nhập email và mật khẩu.'
        : 'Please enter email and password.');
      return;
    }

    this.isLoading = true;

    this.http.post<{ token: string; user: any }>('http://localhost:3002/api/auth/login', {
      identifier: u,
      password: p
    }).subscribe({
      next: (res) => {
        this.isLoading = false;

        if (res.user.role !== 'admin') {
          this.showError(this.currentLang === 'vi'
            ? 'Tài khoản này không có quyền quản lý.'
            : 'This account does not have admin access.');
          this.cdr.detectChanges();
          return;
        }

        // Lưu token và thông tin user
        localStorage.setItem('token', res.token);
        localStorage.setItem('ngogia_user', JSON.stringify(res.user));
        localStorage.setItem('authAdmin', JSON.stringify(res.user));
        window.dispatchEvent(new Event('user-login'));
        this.router.navigate(['/admin-dashboard']).then(() => this.cdr.detectChanges());
      },
      error: (err) => {
        this.isLoading = false;
        const raw = (err.error?.message || '').trim();
        const isInvalidCreds = /invalid\s*credentials/i.test(raw);
        const msg = isInvalidCreds
          ? (this.t['error.invalidCredentials'] || (this.currentLang === 'vi' ? 'Thông tin đăng nhập không hợp lệ' : 'Invalid credentials'))
          : (raw || (this.t['error.loginFailed'] || (this.currentLang === 'vi' ? 'Đăng nhập thất bại' : 'Login failed')));
        this.showError(msg);
        this.cdr.detectChanges();
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onLogin();
  }
}