import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPassword implements OnDestroy {
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
  

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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
    // Sau 1,5 giây, bắt đầu ẩn
    this.messageTimer = setTimeout(() => {
      this.isHiding = true; 
      this.cdr.detectChanges();

      // Sau khi transition kết thúc (150ms), xóa message khỏi DOM
      this.hideTimer = setTimeout(() => {
        this.errorMessage = '';
        this.successMessage = '';
        this.isHiding = false;
        this.cdr.detectChanges();
      }, 150); // thời gian khớp với transition
    }, 1500);
  }
  }

  ngOnDestroy() {
    if (this.messageTimer) clearTimeout(this.messageTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  onRequestOtp() {
    if (!this.email) {
      this.showMessage('error', 'Vui lòng nhập email');
      return;
    }
    this.isLoading = true;
    this.http.post<{ message: string }>('http://localhost:3002/api/auth/forgot-password', { email: this.email })
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
          this.showMessage('error', err.error?.message || 'Có lỗi xảy ra');
          this.cdr.detectChanges();
        }
      });
  }

  onVerifyOtp() {
    if (!this.otp || this.otp.length !== 6) {
      this.showMessage('error', 'Vui lòng nhập mã OTP 6 số');
      return;
    }
    this.isLoading = true;
    this.http.post<{ message: string }>('http://localhost:3002/api/auth/verify-otp', { email: this.email, otp: this.otp })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showMessage('success', res.message);
          this.step = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.showMessage('error', err.error?.message || 'OTP không hợp lệ');
          this.cdr.detectChanges();
        }
      });
  }

  onResetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showMessage('error', 'Vui lòng nhập mật khẩu mới và xác nhận');
      return;
    }
    if (this.newPassword.length < 6) {
      this.showMessage('error', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showMessage('error', 'Mật khẩu xác nhận không khớp');
      return;
    }

    this.isLoading = true;
    this.http.post<{ message: string }>('http://localhost:3002/api/auth/reset-password', {
      email: this.email,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.modalMessage = 'Mật khẩu đã được cập nhật! Vui lòng đăng nhập.';
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showMessage('error', err.error?.message || 'Có lỗi xảy ra');
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