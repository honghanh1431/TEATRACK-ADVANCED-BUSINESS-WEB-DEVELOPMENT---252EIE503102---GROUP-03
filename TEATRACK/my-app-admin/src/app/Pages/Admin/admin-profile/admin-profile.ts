import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-profile',
  standalone: false,
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css',
})
export class AdminProfile implements OnInit, OnDestroy {
  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  fullName = '';
  email = '';
  avatarPreviewUrl = 'assets/icons/user.png';
  userId = '';
  private apiUrl = 'https://teatrack-advanced-business-web.onrender.com/api/auth';
  private apiBaseUrl = 'https://teatrack-advanced-business-web.onrender.com';
  currencyDisplay = 'VND (Việt Nam đồng)';
  smsEnabled = true;

  showEditModal = false;
  showPasswordModal = false;
  showFeatureAlert = false;
  featureAlertMessage = '';
  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  currentEditField: 'fullName' | 'email' | '' = '';
  fieldInputValue = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  currentLang = 'vi';
  t: Record<string, string> = {};
  private storageListener = (e: StorageEvent) => this.onStorageChange(e);

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadAdminProfile();
    const savedLang = localStorage.getItem('app.lang') || 'vi';
    this.currentLang = savedLang;
    this.loadTranslations(savedLang).then(() => this.cdr.detectChanges()).catch(() => this.cdr.detectChanges());
    window.addEventListener('storage', this.storageListener);
  }

  loadAdminProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ user: any }>(`${this.apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const u = res.user;
        this.userId = u._id;
        this.fullName = u.name || '';
        this.email = u.email || '';
        this.avatarPreviewUrl = this.normSrc(u.avatar);
        localStorage.setItem('ngogia_user', JSON.stringify(u));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Load admin profile error:', err)
    });
  }

  normSrc(path?: string): string {
    if (!path) return 'assets/icons/user.png';
    const s = String(path);
    if (s.startsWith('http') || s.startsWith('data:')) return s;
    if (s.startsWith('assets/')) return s;
    if (s.startsWith('/uploads')) return this.apiBaseUrl + s;
    return s;
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  private onStorageChange(e: StorageEvent): void {
    if (e.key === 'app.lang' && e.newValue) {
      this.currentLang = e.newValue;
      this.loadTranslations(e.newValue).then(() => this.cdr.detectChanges()).catch(() => { });
    }
  }

  loadTranslations(lang: string): Promise<void> {
    return new Promise((resolve) => {
      this.http.get<Record<string, string>>(`/lang/${lang}.json`).subscribe({
        next: (data) => {
          this.t = data || {};
          document.documentElement.lang = lang;
          resolve();
        },
        error: (err) => {
          console.warn('Failed to load lang:', lang, err);
          this.t = {};
          resolve();
        }
      });
    });
  }

  tKey(key: string): string {
    return this.t[key] ?? key;
  }

  triggerAvatarInput(): void {
    this.avatarInputRef?.nativeElement?.click();
  }

  showAlert(msg: string): void {
    this.featureAlertMessage = msg;
    this.showFeatureAlert = true;
    this.cdr.detectChanges();
  }

  showConfirm(msg: string, action: () => void): void {
    this.confirmMessage = msg;
    this.confirmAction = action;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmMessage = '';
    this.confirmAction = null;
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('token');
      if (!token) return;

      this.http.put<{ user: any }>(`${this.apiUrl}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.avatarPreviewUrl = this.normSrc(res.user.avatar);
            localStorage.setItem('ngogia_user', JSON.stringify(res.user));
            localStorage.setItem('authAdmin', JSON.stringify(res.user));
            this.cdr.detectChanges();
            // Emit event to update header
            window.dispatchEvent(new CustomEvent('user:updated'));
            this.showAlert(this.tKey('admin.account.modal.updateSuccess'));
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Upload avatar error:', err);
            this.showAlert('Lỗi tải ảnh lên: ' + (err.error?.message || 'Lỗi server'));
          });
        }
      });
    }
  }

  removeAvatar(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.showConfirm('Bạn có chắc muốn gỡ ảnh đại diện?', () => {
      this.http.put<{ user: any }>(`${this.apiUrl}/profile`, { avatar: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.avatarPreviewUrl = 'assets/icons/user.png';
            localStorage.setItem('ngogia_user', JSON.stringify(res.user));
            localStorage.setItem('authAdmin', JSON.stringify(res.user));
            this.cdr.detectChanges();
            window.dispatchEvent(new CustomEvent('user:updated'));
            this.showAlert('Đã gỡ ảnh đại diện');
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Remove avatar error:', err);
            this.showAlert('Lỗi gỡ ảnh: ' + (err.error?.message || 'Lỗi server'));
          });
        }
      });
    });
  }

  openEditField(field: 'fullName' | 'email'): void {
    this.currentEditField = field;
    this.fieldInputValue = field === 'fullName' ? this.fullName : this.email;
    this.showEditModal = true;
  }

  saveField(): void {
    const value = this.fieldInputValue.trim();
    if (!value) {
      this.showAlert(this.tKey('admin.account.modal.pleaseEnterValue'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const body: any = {};
    if (this.currentEditField === 'fullName') body.name = value;
    else if (this.currentEditField === 'email') body.email = value;

    this.http.put<{ user: any }>(`${this.apiUrl}/profile`, body, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          if (this.currentEditField === 'fullName') this.fullName = value;
          else if (this.currentEditField === 'email') this.email = value;

          localStorage.setItem('ngogia_user', JSON.stringify(res.user));
          localStorage.setItem('authAdmin', JSON.stringify(res.user));
          // Emit event to update header
          window.dispatchEvent(new CustomEvent('user:updated'));

          this.closeEditModal();
          this.cdr.detectChanges();
          this.showAlert(this.tKey('admin.account.modal.updateSuccess'));
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Update profile field error:', err);
          this.showAlert('Cập nhật thất bại: ' + (err.error?.message || 'Lỗi server'));
        });
      }
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.currentEditField = '';
    this.fieldInputValue = '';
  }

  openPasswordModal(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.showPasswordModal = true;
  }

  savePassword(): void {
    if (!this.currentPassword.trim() || !this.newPassword.trim() || !this.confirmPassword.trim()) {
      this.showAlert(this.tKey('admin.account.modal.fillAllFields'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.showAlert(this.tKey('admin.account.modal.passwordMismatch'));
      return;
    }
    if (this.newPassword.length < 6) {
      this.showAlert('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.post(`${this.apiUrl}/change-password`, {
      oldPassword: this.currentPassword,
      newPassword: this.newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.closePasswordModal();
          this.cdr.detectChanges();
          this.showAlert(this.tKey('admin.account.modal.passwordChangeSuccess'));
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Change password error:', err);
          this.showAlert('Đổi mật khẩu thất bại: ' + (err.error?.message || 'Lỗi server'));
        });
      }
    });
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') this.showCurrentPassword = !this.showCurrentPassword;
    else if (field === 'new') this.showNewPassword = !this.showNewPassword;
    else if (field === 'confirm') this.showConfirmPassword = !this.showConfirmPassword;
  }

  toggleSMS(checked: boolean): void {
    this.smsEnabled = checked;
  }

  editSMS(): void {
    this.featureAlertMessage = this.tKey('admin.account.featureInDevelopment');
    this.showFeatureAlert = true;
  }

  changeCurrency(): void {
    this.featureAlertMessage = this.tKey('admin.account.featureInDevelopment');
    this.showFeatureAlert = true;
  }

  closeFeatureAlert(): void {
    this.showFeatureAlert = false;
    this.featureAlertMessage = '';
  }
}
