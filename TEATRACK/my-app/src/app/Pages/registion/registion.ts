import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-registion',
  standalone: false,
  templateUrl: './registion.html',
  styleUrls: ['./registion.css'],
})
export class Registion {
  username = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirmPassword = false;

  errors: { username: string; password: string; confirmPassword: string } = {
    username: '',
    password: '',
    confirmPassword: '',
  };

  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  @ViewChild('confirmPasswordInput')
  confirmPasswordInput!: ElementRef<HTMLInputElement>;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private focusField(field: 'username' | 'password' | 'confirmPassword'): void {
    if (field === 'username' && this.usernameInput) {
      this.usernameInput.nativeElement.focus();
    } else if (field === 'password' && this.passwordInput) {
      this.passwordInput.nativeElement.focus();
    } else if (field === 'confirmPassword' && this.confirmPasswordInput) {
      this.confirmPasswordInput.nativeElement.focus();
    }
  }

  private resetErrors(): void {
    this.errors = { username: '', password: '', confirmPassword: '' };
  }

  private validate(): boolean {
    this.resetErrors();

    const u = this.username.trim();
    const p = this.password.trim();
    const cp = this.confirmPassword.trim();

    // Tên đăng nhập: không rỗng, tối thiểu 4 ký tự
    if (!u) {
      this.errors.username = 'Vui lòng nhập tên đăng nhập.';
      this.focusField('username');
      return false;
    }
    if (u.length < 4) {
      this.errors.username = 'Tên đăng nhập phải từ 4 ký tự trở lên.';
      this.focusField('username');
      return false;
    }

    // Mật khẩu: không rỗng, tối thiểu 6 ký tự, có ít nhất 1 chữ và 1 số
    if (!p) {
      this.errors.password = 'Vui lòng nhập mật khẩu.';
      this.focusField('password');
      return false;
    }
    if (p.length < 6) {
      this.errors.password = 'Mật khẩu phải từ 6 ký tự trở lên.';
      this.focusField('password');
      return false;
    }
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
      this.errors.password =
        'Mật khẩu phải bao gồm cả chữ và số để tăng bảo mật.';
      this.focusField('password');
      return false;
    }

    // Xác nhận mật khẩu: không rỗng, trùng khớp
    if (!cp) {
      this.errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu.';
      this.focusField('confirmPassword');
      return false;
    }
    if (cp !== p) {
      this.errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
      this.focusField('confirmPassword');
      return false;
    }

    return true;
  }

  onSubmit(): void {
    if (!this.validate()) {
      return;
    }

    // TODO: Gọi API đăng ký thực tế tại đây.
    // Tạm thời chỉ log ra console.
    console.log('Đăng ký thành công với:', {
      username: this.username.trim(),
      password: this.password.trim(),
    });
  }
}
