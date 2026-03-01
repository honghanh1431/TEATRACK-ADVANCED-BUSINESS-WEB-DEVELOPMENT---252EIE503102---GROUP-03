import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-registion',
  standalone: false,
  templateUrl: './registion.html',
  styleUrls: ['./registion.css'],
})
export class Registion {
  constructor(private router: Router, private http: HttpClient) {}

  // Dữ liệu form
  username = '';
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  address = '';
  isLoading = false;

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

    // Validate Username
    if (!username) {
      this.errors.username = 'Vui lòng nhập tên đăng nhập.';
      this.focusField('username');
      return false;
    }
    if (username.length < 4) {
      this.errors.username = 'Tên đăng nhập phải từ 4 ký tự trở lên.';
      this.focusField('username');
      return false;
    }

    // Validate Họ tên
    if (!name) {
      this.errors.name = 'Vui lòng nhập họ tên.';
      this.focusField('name');
      return false;
    }

    // Validate Email
    if (!email) {
      this.errors.email = 'Vui lòng nhập email.';
      this.focusField('email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errors.email = 'Email không hợp lệ.';
      this.focusField('email');
      return false;
    }

    // Validate Mật khẩu
    if (!pwd) {
      this.errors.password = 'Vui lòng nhập mật khẩu.';
      this.focusField('password');
      return false;
    }
    if (pwd.length < 6) {
      this.errors.password = 'Mật khẩu phải từ 6 ký tự trở lên.';
      this.focusField('password');
      return false;
    }
    if (!/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      this.errors.password = 'Mật khẩu phải bao gồm cả chữ và số.';
      this.focusField('password');
      return false;
    }

    // Validate Xác nhận mật khẩu
    if (!confirmPwd) {
      this.errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
      this.focusField('confirmPassword');
      return false;
    }
    if (confirmPwd !== pwd) {
      this.errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
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
        next: (res) => {
          this.isLoading = false;
          alert('Đăng ký thành công! Vui lòng đăng nhập.');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
          alert(msg);
        }
      });
  }
}