import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword implements OnInit, OnDestroy {
  step: number = 1;
  email: string = '';
  otp: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage: string = '';
  successMessage: string = '';
  isHiding: boolean = false;
  private messageTimer: any;
  private hideTimer: any;
  showSuccessModal: boolean = false;
  modalMessage: string = '';

  currentLang = 'vi';
  t: Record<string, string> = {};

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const savedLang = localStorage.getItem('lang') || 'vi';
    this.loadLang(savedLang);
  }

  loadLang(lang: string): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.http.get<Record<string, string>>(`/lang/${lang}.json`).subscribe({
      next: (data) => {
        this.t = data;
        this.currentLang = lang;
        this.cdr.detectChanges();
      },
      error: () => { console.warn('Không load được file ngôn ngữ'); }
    });
  }

  setLang(lang: string): void {
    this.loadLang(lang);
  }

  private showMessage(type: 'error' | 'success', msg: string) {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.isHiding = false;

    if (type === 'error') {
      this.errorMessage = msg;
      this.successMessage = '';
    } else {
      this.successMessage = msg;
      this.errorMessage = '';
    }

    if (msg) {
      this.messageTimer = setTimeout(() => {
        this.isHiding = true;
        this.cdr.detectChanges();

        this.hideTimer = setTimeout(() => {
          this.errorMessage = '';
          this.successMessage = '';
          this.isHiding = false;
          this.cdr.detectChanges();
        }, 150);
      }, 1500);
    }
  }

  ngOnDestroy() {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  onRequestOtp() {
    if (!this.email) {
      this.showMessage('error', this.t['fp.error.enterEmail'] || (this.currentLang === 'vi' ? 'Vui lòng nhập email' : 'Please enter your email'));
      return;
    }
    this.isLoading = true;
    this.http.post<{ message: string }>('https://teatrack-advanced-business-web.onrender.com/api/auth/forgot-password', { email: this.email, lang: this.currentLang })
      .subscribe({
        next: (res) => {
          console.log('Thành công:', res);
          this.isLoading = false;
          this.showMessage('success', res.message);
          this.step = 2;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Lỗi:', err);
          this.isLoading = false;
          this.showMessage('error', err.error?.message || (this.t['fp.error.generic'] || (this.currentLang === 'vi' ? 'Có lỗi xảy ra' : 'Something went wrong')));
          this.cdr.detectChanges();
        }
      });
  }

  onVerifyOtp() {
    if (!this.otp || this.otp.length !== 6) {
      this.showMessage('error', this.t['fp.error.enterOtp'] || (this.currentLang === 'vi' ? 'Vui lòng nhập mã OTP 6 số' : 'Please enter 6-digit OTP code'));
      return;
    }
    this.isLoading = true;
    this.http.post<{ message: string }>('https://teatrack-advanced-business-web.onrender.com/api/auth/verify-otp', { email: this.email, otp: this.otp, lang: this.currentLang })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showMessage('success', res.message);
          this.step = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.showMessage('error', err.error?.message || (this.t['fp.error.otpInvalid'] || (this.currentLang === 'vi' ? 'OTP không hợp lệ' : 'Invalid OTP')));
          this.cdr.detectChanges();
        }
      });
  }

  onResetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showMessage('error', this.t['fp.error.enterPasswords'] || (this.currentLang === 'vi' ? 'Vui lòng nhập mật khẩu mới và xác nhận' : 'Please enter new password and confirmation'));
      return;
    }
    if (this.newPassword.length < 6) {
      this.showMessage('error', this.t['fp.error.passwordMin'] || (this.currentLang === 'vi' ? 'Mật khẩu phải có ít nhất 6 ký tự' : 'Password must be at least 6 characters'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showMessage('error', this.t['fp.error.passwordMismatch'] || (this.currentLang === 'vi' ? 'Mật khẩu xác nhận không khớp' : 'Passwords do not match'));
      return;
    }

    this.isLoading = true;
    this.http.post<{ message: string }>('https://teatrack-advanced-business-web.onrender.com/api/auth/reset-password', {
      email: this.email,
      newPassword: this.newPassword,
      lang: this.currentLang
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.modalMessage = this.t['fp.modal.success'] || (this.currentLang === 'vi' ? 'Mật khẩu đã được cập nhật! Vui lòng đăng nhập.' : 'Password updated! Please sign in.');
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showMessage('error', err.error?.message || (this.t['fp.error.generic'] || (this.currentLang === 'vi' ? 'Có lỗi xảy ra' : 'Something went wrong')));
        this.cdr.detectChanges();
      }
    });
  }

  goBack() {
    if (this.step > 1) this.step--;
  }
  closeModalAndNavigate() {
    this.showSuccessModal = false;
    this.router.navigate(['/login']);
  }
}