import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-profile',
  standalone: false,
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css',
})
export class AdminProfile implements OnInit, OnDestroy {
  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  fullName = 'Nguyễn Ba Đù';
  email = 'badudeptra@gmail.com';
  avatarPreviewUrl = 'assets/icons/user.png';
  currencyDisplay = 'VND (Việt Nam đồng)';
  smsEnabled = true;

  showEditModal = false;
  showPasswordModal = false;
  showFeatureAlert = false;
  featureAlertMessage = '';

  currentEditField: 'fullName' | 'email' | '' = '';
  fieldInputValue = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  currentLang = 'vi';
  t: Record<string, string> = {};
  private storageListener = (e: StorageEvent) => this.onStorageChange(e);

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const savedLang = localStorage.getItem('app.lang') || 'vi';
    this.currentLang = savedLang;
    this.loadTranslations(savedLang).then(() => this.cdr.detectChanges()).catch(() => this.cdr.detectChanges());
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  private onStorageChange(e: StorageEvent): void {
    if (e.key === 'app.lang' && e.newValue) {
      this.currentLang = e.newValue;
      this.loadTranslations(e.newValue).then(() => this.cdr.detectChanges()).catch(() => {});
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

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreviewUrl = (e.target?.result as string) ?? this.avatarPreviewUrl;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  openEditField(field: 'fullName' | 'email'): void {
    this.currentEditField = field;
    this.fieldInputValue = field === 'fullName' ? this.fullName : this.email;
    this.showEditModal = true;
  }

  saveField(): void {
    const value = this.fieldInputValue.trim();
    if (!value) {
      alert(this.tKey('admin.account.modal.pleaseEnterValue'));
      return;
    }
    if (this.currentEditField === 'fullName') this.fullName = value;
    else if (this.currentEditField === 'email') this.email = value;
    this.closeEditModal();
    alert(this.tKey('admin.account.modal.updateSuccess'));
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
      alert(this.tKey('admin.account.modal.fillAllFields'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      alert(this.tKey('admin.account.modal.passwordMismatch'));
      return;
    }
    if (this.newPassword.length < 8) {
      alert(this.tKey('admin.account.modal.passwordMinLength'));
      return;
    }
    this.closePasswordModal();
    alert(this.tKey('admin.account.modal.passwordChangeSuccess'));
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
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
