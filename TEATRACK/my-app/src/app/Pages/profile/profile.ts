import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface UserProfile {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  verified?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
// ── Tab ───────────────────────────────────
  activeTab: 'profile' | 'security' | 'policy' | 'support' = 'profile';

  // ── Dữ liệu user ─────────────────────────
  user: UserProfile = {
    fullName: 'Nguyễn Thị Hồng Hạnh',
    dob: '31/07/2005',
    gender: 'Nữ',
    email: 'badudeptrai@gmail.com',
    phone: '0123456789',
    address: 'HT Pearl, Quốc lộ 1K, Thành phố Thủ Đức, Thành phố Hồ Chí Minh.',
  };

  username  = 'ngogia_user';
  password  = '************';
  status    = 'Chưa xác minh';

  // ── Avatar ────────────────────────────────
  avatarSrc = 'assets/images/user-default.png';

  // ── Edit mode ────────────────────────────
  isEditing         = false;
  isEditingSecurity = false;
  private userSnapshot: UserProfile = {};

  // ── Danh sách liên hệ hỗ trợ ─────────────
  contacts = [
    { label: 'Facebook',  icon: 'assets/icons/facebook.png', href: 'https://byvn.net/o4Yn',                         display: 'https://byvn.net/o4Yn' },
    { label: 'TikTok',    icon: 'assets/icons/tiktok.png',   href: 'https://www.tiktok.com/@hongtrangogiavn',        display: 'tiktok.com/@hongtrangogiavn' },
    { label: 'Instagram', icon: 'assets/icons/ig.png',       href: 'https://www.instagram.com/wujiablacktea/',       display: 'instagram.com/wujiablacktea' },
    { label: 'Email',     icon: 'assets/icons/mail.png',     href: 'mailto:marketing@wujiateavn.com',                display: 'marketing@wujiateavn.com' },
    { label: 'Hotline',   icon: 'assets/icons/phone.png',    href: 'tel:0999888777',                                 display: '0.999.888.777' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Đọc user từ localStorage nếu có
    const saved = this.getUser();
    if (saved && Object.keys(saved).length > 0) {
      this.user     = { ...this.user, ...saved };
      this.username = saved.username || this.username;
      this.status   = saved.verified ? 'Đã xác minh' : 'Chưa xác minh';
    }

    // Đọc tab từ URL fragment
    this.route.fragment.subscribe(fragment => {
      const validTabs = ['profile', 'security', 'policy', 'support'];
      this.activeTab = (validTabs.includes(fragment || '')
        ? fragment
        : 'profile') as any;
    });
  }

  // ── Chuyển tab ────────────────────────────
  setTab(tab: 'profile' | 'security' | 'policy' | 'support'): void {
    this.activeTab = tab;
    this.router.navigate([], { fragment: tab });
  }

  // ── Edit profile ──────────────────────────
  startEdit(): void {
    this.userSnapshot = { ...this.user };
    this.isEditing = true;
  }

  saveProfile(): void {
    this.setUser(this.user);
    this.isEditing = false;
    alert('Đã lưu hồ sơ (cục bộ).');
  }

  cancelEdit(): void {
    this.user = { ...this.userSnapshot };
    this.isEditing = false;
  }

  // ── Avatar ────────────────────────────────
  uploadAvatar(): void {
    document.getElementById('avatarInput')?.click();
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { this.avatarSrc = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    if (confirm('Gỡ ảnh đại diện?')) {
      this.avatarSrc = 'assets/images/user-default.png';
    }
  }

  // ── Đăng xuất ────────────────────────────
  logout(): void {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      localStorage.removeItem('ngogia_user');
      this.router.navigate(['/login']);
    }
  }

  // ── Helpers localStorage ──────────────────
  private getUser(): UserProfile {
    try { return JSON.parse(localStorage.getItem('ngogia_user') || '{}') || {}; }
    catch { return {}; }
  }

  private setUser(u: UserProfile): void {
    localStorage.setItem('ngogia_user', JSON.stringify(u));
  }
}
