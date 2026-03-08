import { Component, ElementRef, ViewChild, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-registion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './registion.html',
  styleUrls: ['./registion.css'],
})
export class Registion implements OnInit {
  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) { }

  currentLang = 'vi';
  t: Record<string, string> = {};

  ngOnInit() {
    const savedLang = localStorage.getItem('lang') || 'vi';
    this.loadLang(savedLang);
    this.titleService.setTitle(this.currentLang === 'vi' ? 'Đăng ký | Hồng Trà Ngô Gia' : 'Register | Hồng Trà Ngô Gia');
  }

  loadLang(lang: string): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.http.get<Record<string, string>>(`/lang/${lang}.json`).subscribe({
      next: (data) => {
        this.t = data;
        this.titleService.setTitle(lang === 'vi' ? 'Đăng ký | Hồng Trà Ngô Gia' : 'Register | Hồng Trà Ngô Gia');
        this.cdr.detectChanges();
      },
      error: () => { this.cdr.detectChanges(); }
    });
  }

  setLang(lang: string): void {
    this.loadLang(lang);
  }

  // Dữ liệu form
  username = '';
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  address = '';
  isLoading = false;

  /** Modal thông báo đăng ký (thành công / lỗi) */
  showAlertModal = false;
  alertType: 'success' | 'error' = 'error';
  alertTitle = '';
  alertMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  // Đối tượng lưu lỗi cho từng field 
  errors: any = {
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  // ViewChild cho các input 
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  @ViewChild('confirmPasswordInput') confirmPasswordInput!: ElementRef<HTMLInputElement>;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Focus vào field bị lỗi 
  private focusField(field: string): void {
    if (field === 'username' && this.usernameInput) {
      this.usernameInput.nativeElement.focus();
    } else if (field === 'name' && this.nameInput) {
      this.nameInput.nativeElement.focus();
    } else if (field === 'email' && this.emailInput) {
      this.emailInput.nativeElement.focus();
    } else if (field === 'password' && this.passwordInput) {
      this.passwordInput.nativeElement.focus();
    } else if (field === 'confirmPassword' && this.confirmPasswordInput) {
      this.confirmPasswordInput.nativeElement.focus();
    }
  }

  // Reset tất cả lỗi 
  private resetErrors(): void {
    this.errors = {
      username: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    };
  }

  // Validate dữ liệu nhập
  private validate(): boolean {
    this.resetErrors();

    const username = this.username.trim();
    const name = this.name.trim();
    const email = this.email.trim();
    const pwd = this.password.trim();
    const confirmPwd = this.confirmPassword.trim();

    const vi = this.currentLang === 'vi';
    // Validate Username
    if (!username) {
      this.errors.username = this.t['register.error.usernameRequired'] || (vi ? 'Vui lòng nhập tên đăng nhập.' : 'Please enter username.');
      this.focusField('username');
      return false;
    }
    if (username.length < 4) {
      this.errors.username = this.t['register.error.usernameMin'] || (vi ? 'Tên đăng nhập phải từ 4 ký tự trở lên.' : 'Username must be at least 4 characters.');
      this.focusField('username');
      return false;
    }

    // Validate Họ tên
    if (!name) {
      this.errors.name = this.t['register.error.nameRequired'] || (vi ? 'Vui lòng nhập họ tên.' : 'Please enter your full name.');
      this.focusField('name');
      return false;
    }

    // Validate Email
    if (!email) {
      this.errors.email = this.t['register.error.emailRequired'] || (vi ? 'Vui lòng nhập email.' : 'Please enter email.');
      this.focusField('email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errors.email = this.t['register.error.emailInvalid'] || (vi ? 'Email không hợp lệ.' : 'Invalid email address.');
      this.focusField('email');
      return false;
    }

    // Validate Mật khẩu
    if (!pwd) {
      this.errors.password = this.t['register.error.passwordRequired'] || (vi ? 'Vui lòng nhập mật khẩu.' : 'Please enter password.');
      this.focusField('password');
      return false;
    }
    if (pwd.length < 6) {
      this.errors.password = this.t['register.error.passwordMin'] || (vi ? 'Mật khẩu phải từ 6 ký tự trở lên.' : 'Password must be at least 6 characters.');
      this.focusField('password');
      return false;
    }
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      this.errors.password = this.t['register.error.passwordFormat'] || (vi ? 'Mật khẩu phải bao gồm cả chữ và số.' : 'Password must include both letters and numbers.');
      this.focusField('password');
      return false;
    }

    // Validate Xác nhận mật khẩu
    if (!confirmPwd) {
      this.errors.confirmPassword = this.t['register.error.confirmRequired'] || (vi ? 'Vui lòng xác nhận mật khẩu.' : 'Please confirm your password.');
      this.focusField('confirmPassword');
      return false;
    }
    if (confirmPwd !== pwd) {
      this.errors.confirmPassword = this.t['register.error.confirmMismatch'] || (vi ? 'Mật khẩu xác nhận không trùng khớp.' : 'Passwords do not match.');
      this.focusField('confirmPassword');
      return false;
    }

    return true;
  }

  // Xử lý submit form
  onSubmit(): void {
    if (!this.validate()) {
      return;
    }

    this.isLoading = true;

    const userData = {
      username: this.username.trim(),
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password.trim(),
      phone: this.phone.trim(),
      address: this.address.trim()
    };

    this.http.post<{ message: string; user: any }>('http://localhost:3002/api/auth/register', userData)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.alertType = 'success';
          const vi = this.currentLang === 'vi';
          this.alertTitle = this.t['register.alert.successTitle'] || (vi ? 'Thành công' : 'Success');
          this.alertMessage = this.t['register.alert.successMessage'] || (vi ? 'Đăng ký thành công! Vui lòng đăng nhập.' : 'Registration successful! Please sign in.');
          this.showAlertModal = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.alertType = 'error';
          const vi = this.currentLang === 'vi';
          this.alertTitle = this.t['register.alert.errorTitle'] || (vi ? 'Đăng ký thất bại' : 'Registration failed');
          this.alertMessage = err.error?.message || this.t['register.alert.errorMessage'] || (vi ? 'Đăng ký thất bại. Vui lòng thử lại.' : 'Registration failed. Please try again.');
          this.showAlertModal = true;
          this.cdr.detectChanges();
        }
      });
  }

  closeAlertModal(): void {
    this.showAlertModal = false;
    if (this.alertType === 'success') {
      this.router.navigate(['/login']);
    }
  }
}