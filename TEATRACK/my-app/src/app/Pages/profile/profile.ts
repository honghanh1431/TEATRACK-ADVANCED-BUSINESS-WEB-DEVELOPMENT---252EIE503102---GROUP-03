import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface UserProfile {
  _id?: string;
  username?: string;
  name?: string;        // từ server
  fullName?: string;    // dùng trong giao diện
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  gender?: string;
  verified?: boolean;
  avatar?: string;
  role?: string;
}

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit, OnDestroy {
  activeTab: 'profile' | 'security' | 'policy' | 'support' = 'profile';

  user: UserProfile = {
    fullName: '',
    name: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    avatar: ''
  };

  username = '';
  password = '************';
  status = 'Chưa xác minh';

  avatarSrc = 'assets/icons/user.png'; // dùng để hiển thị preview
  selectedAvatarFile: File | null = null; // lưu file người dùng chọn

  isEditing = false;
  isEditingSecurity = false;
  private userSnapshot: UserProfile = {};

  contacts = [
    { label: 'Facebook', icon: 'assets/icons/facebook.png', href: 'https://byvn.net/o4Yn', display: 'https://byvn.net/o4Yn' },
    { label: 'TikTok', icon: 'assets/icons/tiktok.png', href: 'https://www.tiktok.com/@hongtrangogiavn', display: 'tiktok.com/@hongtrangogiavn' },
    { label: 'Instagram', icon: 'assets/icons/ig.png', href: 'https://www.instagram.com/wujiablacktea/', display: 'instagram.com/wujiablacktea' },
    { label: 'Email', icon: 'assets/icons/mail.png', href: 'mailto:marketing@wujiateavn.com', display: 'marketing@wujiateavn.com' },
    { label: 'Hotline', icon: 'assets/icons/phone.png', href: 'tel:02723979518', display: '02-723-979-518' },
  ];

  private apiUrl = 'http://localhost:3002/api/auth';
  private apiBaseUrl = 'http://localhost:3002'; // dùng để ghép với đường dẫn ảnh từ server

  showLogoutModal = false;
  showAvatarModal = false;
  showSavedModal = false;

  // Thêm biến loading để tránh double click
  isSaving = false;

  // Thêm các biến cho tab security
  securityEditData = {
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  securityError = '';
  securitySuccess = '';
  isChangingPassword = false; // tránh double click

  private errorTimeout: any;
  private successTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadUserFromServer();
    this.route.fragment.subscribe(fragment => {
      const validTabs = ['profile', 'security', 'policy', 'support'];
      this.activeTab = (validTabs.includes(fragment || '') ? fragment : 'profile') as any;
    });
  }
  ngOnDestroy(): void {
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    if (this.successTimeout) clearTimeout(this.successTimeout);
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadUserFromServer(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<{ user: any }>(`${this.apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        const userData = res.user;
        this.user = {
          ...userData,
          fullName: userData.name || ''
        };
        this.username = userData.username || '';
        this.status = userData.verified ? 'Đã xác minh' : 'Chưa xác minh';
        // Xử lý avatar: nếu có ảnh, ghép với baseUrl; nếu không, dùng ảnh mặc định
        if (userData.avatar) {
          // Nếu avatar là đường dẫn tương đối (bắt đầu bằng /uploads), ghép với apiBaseUrl
          if (userData.avatar.startsWith('/uploads')) {
            this.avatarSrc = this.apiBaseUrl + userData.avatar;
          } else {
            this.avatarSrc = userData.avatar; // trường hợp là full URL
          }
        } else {
          this.avatarSrc = 'assets/icons/user.png';
        }
        localStorage.setItem('ngogia_user', JSON.stringify(userData));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi tải user:', err);
        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  setTab(tab: 'profile' | 'security' | 'policy' | 'support'): void {
    this.activeTab = tab;
    this.router.navigate([], { fragment: tab });
  }

  startEdit(): void {
    // Lưu snapshot để khôi phục nếu hủy
    this.userSnapshot = {
      ...this.user,
      fullName: this.user.fullName // giữ lại fullName
    };
    this.isEditing = true;
    // Không cần reset file vì người dùng có thể chọn ảnh mới
  }

  saveProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.isSaving = true;

    // Tạo FormData để gửi cả file và dữ liệu text
    const formData = new FormData();
    formData.append('name', this.user.fullName || '');
    formData.append('email', this.user.email || '');
    formData.append('phone', this.user.phone || '');
    formData.append('address', this.user.address || '');
    formData.append('dob', this.user.dob || '');
    formData.append('gender', this.user.gender || '');

    // Xử lý avatar
    if (this.selectedAvatarFile) {
      // Trường hợp 1: có file mới được chọn
      formData.append('avatar', this.selectedAvatarFile, this.selectedAvatarFile.name);
    } else if (this.avatarSrc === 'assets/icons/user.png') {
      // Trường hợp 2: người dùng đã xóa ảnh (avatarSrc là mặc định) và không có file mới
      // Gửi avatar rỗng để xóa ảnh trên server
      formData.append('avatar', '');
    }
    // Trường hợp 3: giữ nguyên ảnh cũ (không có file mới, avatarSrc không phải mặc định) -> không gửi trường avatar

    this.http.put<{ user: any }>(`${this.apiUrl}/profile`, formData, {
      headers: { Authorization: `Bearer ${token}` }
      // Không set Content-Type, trình duyệt tự set với boundary
    }).subscribe({
      next: (res) => {
        const updatedUser = res.user;
        this.user = {
          ...updatedUser,
          fullName: updatedUser.name || ''
        };
        // Cập nhật avatarSrc từ đường dẫn mới
        if (updatedUser.avatar) {
          if (updatedUser.avatar.startsWith('/uploads')) {
            this.avatarSrc = this.apiBaseUrl + updatedUser.avatar;
          } else {
            this.avatarSrc = updatedUser.avatar;
          }
        } else {
          this.avatarSrc = 'assets/icons/user.png';
        }
        this.isEditing = false;
        this.selectedAvatarFile = null; // xóa file tạm
        this.showSavedModal = true;
        this.isSaving = false;
        localStorage.setItem('ngogia_user', JSON.stringify(updatedUser));
        // Đồng bộ thông tin giao hàng: cập nhật ngogia_shipping ngay để cart đọc được khi mount
        try {
          const shippingRaw = localStorage.getItem('ngogia_shipping');
          const shipping = shippingRaw ? JSON.parse(shippingRaw) : {};
          if (updatedUser.name) shipping.receiver = updatedUser.name.trim();
          if (updatedUser.phone) shipping.phone = updatedUser.phone.trim();
          if (updatedUser.address) shipping.address = updatedUser.address.trim();
          localStorage.setItem('ngogia_shipping', JSON.stringify(shipping));
        } catch (_) { }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user:updated'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Lỗi cập nhật:', err);
        this.isSaving = false;
        // Hiển thị lỗi (bạn có thể dùng một biến errorMessage để hiển thị trên giao diện)
        alert('Cập nhật thất bại: ' + (err.error?.message || 'Lỗi không xác định'));
      }
    });
  }

  cancelEdit(): void {
    // Khôi phục user từ snapshot
    this.user = { ...this.userSnapshot };
    // Khôi phục avatarSrc từ snapshot
    if (this.user.avatar) {
      if (this.user.avatar.startsWith('/uploads')) {
        this.avatarSrc = this.apiBaseUrl + this.user.avatar;
      } else {
        this.avatarSrc = this.user.avatar;
      }
    } else {
      this.avatarSrc = 'assets/icons/user.png';
    }
    this.selectedAvatarFile = null; // hủy file tạm
    this.isEditing = false;
  }
  // Bắt đầu chỉnh sửa security
  startEditSecurity(): void {
    // Khởi tạo dữ liệu edit từ user hiện tại
    this.securityEditData.username = this.username;
    this.securityEditData.currentPassword = '';
    this.securityEditData.newPassword = '';
    this.securityEditData.confirmPassword = '';
    this.securityError = '';
    this.securitySuccess = '';
    this.isEditingSecurity = true;
  }
  // Hủy chỉnh sửa security
  cancelEditSecurity(): void {
    this.isEditingSecurity = false;
    this.securityError = '';
    this.securitySuccess = '';
  }
  private showError(message: string): void {
    this.securityError = message;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => {
      this.securityError = '';
      this.cdr.detectChanges();
    }, 2000);
  }

  private showSuccess(message: string): void {
    this.securitySuccess = message;
    if (this.successTimeout) clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => {
      this.securitySuccess = '';
      this.cdr.detectChanges();
    }, 2000);
  }
  // Lưu thay đổi (có thể gọi cả hai API nếu có thay đổi)
  saveSecurityChanges(): void {
    // Kiểm tra dữ liệu
    if (!this.securityEditData.username) {
      this.showError('Username không được để trống'); // 👈 sửa
      return;
    }

    // Nếu có thay đổi mật khẩu thì phải nhập đủ
    if (this.securityEditData.newPassword || this.securityEditData.confirmPassword || this.securityEditData.currentPassword) {
      if (!this.securityEditData.currentPassword) {
        this.showError('Vui lòng nhập mật khẩu hiện tại');
        return;
      }
      if (!this.securityEditData.newPassword) {
        this.showError('Vui lòng nhập mật khẩu mới');
        return;
      }
      if (this.securityEditData.newPassword.length < 6) {
        this.showError('Mật khẩu mới phải có ít nhất 6 ký tự');
        return;
      }
      if (this.securityEditData.newPassword !== this.securityEditData.confirmPassword) {
        this.showError('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    // Thực hiện cập nhật username trước (nếu thay đổi)
    const usernameChanged = this.securityEditData.username !== this.username;
    const passwordChanged = !!this.securityEditData.newPassword;
    // Thêm kiểm tra không có thay đổi (tùy chọn, có thể thêm)
    if (!usernameChanged && !passwordChanged) {
      this.showError('Không có thông tin nào thay đổi'); // 👈 thêm mới (có thể bỏ qua nếu không muốn)
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    this.isChangingPassword = true;
    this.securityError = '';
    this.securitySuccess = '';

    // Hàm xử lý tuần tự
    const performUpdates = async () => {
      try {
        if (usernameChanged) {
          // Gọi API update username
          await this.http.put(`${this.apiUrl}/username`, { username: this.securityEditData.username }, {
            headers: { Authorization: `Bearer ${token}` }
          }).toPromise();
          // Cập nhật username trong component
          this.username = this.securityEditData.username;
          // Cập nhật localStorage
          const user = JSON.parse(localStorage.getItem('ngogia_user') || '{}');
          user.username = this.securityEditData.username;
          localStorage.setItem('ngogia_user', JSON.stringify(user));
          // Dispatch event để header cập nhật
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('user:updated'));
          }
        }

        if (passwordChanged) {
          // Gọi API đổi mật khẩu
          await this.http.post(`${this.apiUrl}/change-password`, {
            oldPassword: this.securityEditData.currentPassword,
            newPassword: this.securityEditData.newPassword
          }, {
            headers: { Authorization: `Bearer ${token}` }
          }).toPromise();
        }

        // Thành công
        this.showSuccess('Cập nhật thành công!');
        this.isEditingSecurity = false;
      } catch (error: any) {
        console.error('Lỗi cập nhật:', error);
        this.showError(error.error?.message || 'Có lỗi xảy ra');
      } finally {
        this.isChangingPassword = false;
        this.cdr.detectChanges();
      }
    };

    performUpdates();
  }

  uploadAvatar(): void {
    document.getElementById('avatarInput')?.click();
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ảnh không được vượt quá 5MB');
      return;
    }
    // Kiểm tra định dạng
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)');
      return;
    }

    // Lưu file để gửi sau
    this.selectedAvatarFile = file;

    // Tạo preview tạm thời bằng base64
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarSrc = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.showAvatarModal = true;
  }

  confirmRemoveAvatar(): void {
    // Xóa ảnh: set avatarSrc về mặc định, xóa file tạm
    this.avatarSrc = 'assets/icons/user.png';
    this.selectedAvatarFile = null;
    this.showAvatarModal = false;

    // Nếu không ở chế độ chỉnh sửa, cập nhật ngay lập tức (gọi API xóa avatar)
    if (!this.isEditing) {
      this.saveAvatarOnly('');
    }
  }

  private saveAvatarOnly(avatar: string): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const formData = new FormData();
    formData.append('avatar', avatar); // gửi chuỗi rỗng để xóa

    this.http.put(`${this.apiUrl}/profile`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        const user = JSON.parse(localStorage.getItem('ngogia_user') || '{}');
        user.avatar = '';
        localStorage.setItem('ngogia_user', JSON.stringify(user));
        // Cập nhật lại avatarSrc nếu cần (đã set về mặc định trước đó)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user:updated'));
        }
      },
      error: (err) => console.error('Lỗi cập nhật avatar:', err)
    });
  }

  closeAvatarModal(): void {
    this.showAvatarModal = false;
  }

  logout(): void {
    this.openLogoutModal();
  }

  openLogoutModal(): void {
    this.showLogoutModal = true;
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('authAdmin');
    localStorage.removeItem('ngogia_user');
    localStorage.removeItem('cart_items');
    localStorage.removeItem('ngogia_shipping');
    localStorage.removeItem('ngogia_coupon');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'));
      window.dispatchEvent(new CustomEvent('user:logout'));
    }
    this.showLogoutModal = false;
    this.router.navigate(['/']);
  }


  closeSavedModal(): void {
    this.showSavedModal = false;
  }

  private getUser(): UserProfile {
    try { return JSON.parse(localStorage.getItem('ngogia_user') || '{}') || {}; }
    catch { return {}; }
  }

  private setUser(u: UserProfile): void {
    localStorage.setItem('ngogia_user', JSON.stringify(u));
  }
}