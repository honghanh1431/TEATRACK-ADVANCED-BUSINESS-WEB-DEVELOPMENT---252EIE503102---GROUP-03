import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

export interface Account {
  id: string | number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'vip customer' | 'normal customer';
  status: 'active' | 'locked';
  phone: string;
  address: string;
  createdAt: string;
  avatar?: string;
  loginHistory?: string[];
}

const AVATAR_COLORS: [string, string, string][] = [
  ['#4fffb0', '#00d4ff', '#0d0f12'],
  ['#c084fc', '#818cf8', '#fff'],
  ['#ff4f6a', '#ff6b35', '#fff'],
  ['#4fb4ff', '#22d3ee', '#0d0f12'],
  ['#ffb84f', '#ffd700', '#0d0f12'],
];

const MOCK_ACCOUNTS: Account[] = [
  { id: 1, name: 'Administrator', username: 'Admin123', email: 'admin@teatrack.com', role: 'admin', status: 'active', phone: '', address: '', createdAt: '2026-03-01' },
  { id: 2, name: 'Nguyễn Thị Lan', username: 'lanngoc99', email: 'lan.nguyen@gmail.com', role: 'vip customer', status: 'active', phone: '0912345678', address: 'Hà Nội', createdAt: '2026-01-15' },
  { id: 3, name: 'Trần Minh Hoàng', username: 'hoangTM', email: 'hoang.tran@yahoo.com', role: 'normal customer', status: 'active', phone: '0987654321', address: 'TP.HCM', createdAt: '2026-01-20' },
  { id: 4, name: 'Phạm Thu Hà', username: 'thuha2k', email: 'thuha@outlook.com', role: 'normal customer', status: 'locked', phone: '0911222333', address: 'Đà Nẵng', createdAt: '2026-02-01' },
  { id: 5, name: 'Lê Văn Đức', username: 'duc.le', email: 'duc.le@teatrack.com', role: 'admin', status: 'active', phone: '0933111222', address: 'Hải Phòng', createdAt: '2026-02-05' },
  { id: 6, name: 'Bùi Khánh Linh', username: 'klinh_bui', email: 'klinh@gmail.com', role: 'vip customer', status: 'active', phone: '0944555666', address: 'Cần Thơ', createdAt: '2026-02-10' },
  { id: 7, name: 'Võ Quốc Bảo', username: 'baovq', email: 'bao.vo@email.com', role: 'normal customer', status: 'locked', phone: '0922333444', address: 'Nha Trang', createdAt: '2026-02-14' },
  { id: 8, name: 'Đặng Thị Mai', username: 'mai.dang', email: 'mai.dang@gmail.com', role: 'normal customer', status: 'active', phone: '0955777888', address: 'Huế', createdAt: '2026-02-18' },
  { id: 9, name: 'Hồ Thanh Tùng', username: 'tunght', email: 'tung.ho@gmail.com', role: 'vip customer', status: 'active', phone: '0966888999', address: 'TP.HCM', createdAt: '2026-02-22' },
  { id: 10, name: 'Ngô Quỳnh Anh', username: 'quinhanh', email: 'quynhanh@email.com', role: 'normal customer', status: 'active', phone: '0977999000', address: 'Hà Nội', createdAt: '2026-03-01' }
];

@Component({
  selector: 'app-admin-account',
  standalone: false,
  templateUrl: './admin-account.html',
  styleUrl: './admin-account.css',
})
export class AdminAccount implements OnInit, OnDestroy {
  accounts: Account[] = [];
  filteredAccounts: Account[] = [];
  selectedIds = new Set<string | number>();
  private socket: Socket | undefined;

  searchQuery = '';
  roleFilter = '';
  statusFilter = '';

  showEditModal = false;
  showDeleteModal = false;
  showLockModal = false;
  showVipModal = false;
  showAlert = false;
  alertMessage = '';

  targetId: string | number | null = null;
  lockAction: 'lock' | 'unlock' = 'lock';

  editModalTitle = 'Chỉnh sửa tài khoản';
  editModalSub = 'Cập nhật thông tin người dùng';
  editModalSubBold = '';
  editName = '';
  editUsername = '';
  editEmail = '';
  editPhone = '';
  editAddress = '';
  editRole: 'admin' | 'vip customer' | 'normal customer' = 'normal customer';
  editAvatarPreview = '';
  editAvatarFile: File | null = null;

  deleteTargetName = '';
  lockTitle = 'Khoá tài khoản?';
  lockSub = 'Người dùng sẽ không thể đăng nhập.';
  lockText = '';
  lockTargetName = '';
  lockConfirmText = 'Khoá tài khoản';
  lockConfirmClass = 'btn-warn';
  vipTargetName = '';
  vipDuration = '6 tháng';

  toasts: { type: string; message?: string; segments?: { text: string; bold?: boolean }[] }[] = [];

  readonly toastIconSrc: Record<string, string> = {
    success: 'assets/icons/tick.png',
    danger: 'assets/icons/delete2.png',
    vip: 'assets/icons/vip.png',
    warn: 'assets/icons/lock.png',
    error: 'assets/icons/lock.png',
  };

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {
    this.socket = io('http://localhost:3002');
    this.socket.on('userUpdated', () => {
      this.fetchUsers();
    });
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  get newAccountsThisMonth(): number {
    const now = new Date();
    return this.accounts.filter(a => {
      if (!a.createdAt) return false;
      const d = new Date(a.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  get newVipsThisWeek(): number {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.accounts.filter(a => {
      if (a.role !== 'vip customer' || !a.createdAt) return false;
      const d = new Date(a.createdAt);
      return d >= oneWeekAgo;
    }).length;
  }

  get loginsToday(): number {
    const now = new Date();
    return this.accounts.reduce((sum, a) => {
      if (!a.loginHistory) return sum;
      return sum + a.loginHistory.filter(dStr => {
        const d = new Date(dStr);
        return !isNaN(d.getTime()) && d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
    }, 0);
  }

  get loginsYesterday(): number {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return this.accounts.reduce((sum, a) => {
      if (!a.loginHistory) return sum;
      return sum + a.loginHistory.filter(dStr => {
        const d = new Date(dStr);
        return !isNaN(d.getTime()) && d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
      }).length;
    }, 0);
  }

  get loginsGrowthPercentage(): string {
    const today = this.loginsToday;
    const yesterday = this.loginsYesterday;
    if (yesterday === 0) return today > 0 ? '+100' : '0';
    const growth = ((today - yesterday) / yesterday) * 100;
    return (growth > 0 ? '+' : '') + Math.round(growth);
  }

  fetchUsers(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.accounts = [...MOCK_ACCOUNTS];
      this.filterTable();
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get<{users: any[]}>('http://localhost:3002/api/admin/users', { headers }).subscribe({
      next: (res) => {
        if (res.users && Array.isArray(res.users)) {
          this.accounts = res.users.map(u => ({
            id: u._id || u.id,
            name: u.name || u.username,
            username: u.username,
            email: u.email,
            role: u.role || 'normal customer',
            status: u.status || 'active',
            phone: u.phone || '',
            address: u.address || '',
            createdAt: u.createdAt || new Date().toISOString(),
            avatar: u.avatar || '',
            loginHistory: u.loginHistory || []
          }));
        } else {
          this.accounts = [...MOCK_ACCOUNTS];
        }
        this.filterTable();
      },
      error: (err) => {
        console.error('Failed to load real users data, fallback to mock', err);
        this.accounts = [...MOCK_ACCOUNTS];
        this.filterTable();
      }
    });
  }

  normSrc(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const apiBaseUrl = 'http://localhost:3002';
    if (path.startsWith('/uploads')) return apiBaseUrl + path;
    return path;
  }

  getInitials(acc: Account): string {
    return acc.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getAvatarColor(i: number): [string, string, string] {
    return AVATAR_COLORS[i % AVATAR_COLORS.length];
  }

  getRoleBadgeClass(role: Account['role']): string {
    if (role === 'admin') return 'badge-admin';
    if (role === 'vip customer') return 'badge-vip';
    return 'badge-user';
  }

  fmtDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  isSelected(id: string | number): boolean {
    return this.selectedIds.has(id);
  }

  filterTable(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredAccounts = this.accounts.filter((a) => {
      const matchQ =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q);
      const matchRole = !this.roleFilter || a.role === this.roleFilter;
      const matchStatus = !this.statusFilter || a.status === this.statusFilter;
      return matchQ && matchRole && matchStatus;
    });
    this.cdr.detectChanges();
  }

  toggleRow(id: string | number, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.cdr.detectChanges();
  }

  toggleAll(checked: boolean): void {
    if (checked) this.filteredAccounts.forEach((a) => this.selectedIds.add(a.id));
    else this.selectedIds.clear();
    this.cdr.detectChanges();
  }

  get allSelected(): boolean {
    return this.filteredAccounts.length > 0 && this.filteredAccounts.every((a) => this.selectedIds.has(a.id));
  }

  openCreate(): void {
    this.editModalTitle = 'THÊM TÀI KHOẢN';
    this.editModalSub = 'Điền thông tin để tạo tài khoản';
    this.editModalSubBold = '';
    this.editName = '';
    this.editUsername = '';
    this.editEmail = '';
    this.editPhone = '';
    this.editAddress = '';
    this.editRole = 'normal customer';
    this.editAvatarPreview = '';
    this.editAvatarFile = null;
    this.targetId = null;
    this.showEditModal = true;
  }

  openEdit(acc: Account): void {
    this.targetId = acc.id;
    this.editModalTitle = 'CHỈNH SỬA TÀI KHOẢN';
    this.editModalSub = 'Cập nhật thông tin của ';
    this.editModalSubBold = `"${acc.name}" (@${acc.username} )`;
    this.editAvatarPreview = this.normSrc(acc.avatar);
    this.editAvatarFile = null;
    this.editName = acc.name;
    this.editUsername = acc.username;
    this.editEmail = acc.email;
    this.editPhone = acc.phone;
    this.editAddress = acc.address;
    this.editRole = acc.role;
    this.showEditModal = true;
  }

  triggerAvatarInput(): void {
    document.getElementById('edit-account-avatar')?.click();
  }

  clearAvatar(): void {
    this.editAvatarPreview = '';
    this.editAvatarFile = null;
  }

  onAvatarFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editAvatarPreview = reader.result as string;
      this.editAvatarFile = file;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  saveEdit(): void {
    const name = this.editName.trim();
    if (!name) {
      this.showToast('warn', 'Vui lòng nhập họ tên');
      return;
    }
    if (this.targetId) {
      const acc = this.accounts.find((a) => a.id === this.targetId)!;
      acc.name = name;
      acc.username = this.editUsername.trim();
      acc.email = this.editEmail.trim();
      acc.phone = this.editPhone.trim();
      acc.address = this.editAddress.trim();
      acc.role = this.editRole;
      const payload = {
        name,
        username: acc.username,
        email: acc.email,
        phone: acc.phone,
        address: acc.address,
        role: acc.role,
        ...(this.editAvatarPreview ? { avatar: this.editAvatarPreview } : {})
      };
      
      const token = localStorage.getItem('token');
      if (token) {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        this.http.put(`http://localhost:3002/api/admin/users/${this.targetId}`, payload, { headers }).subscribe({
          next: () => console.log('User saved to DB'),
          error: (err) => console.error('Failed saving user', err)
        });
      }

      this.showToastWithBold('success', [{ text: 'Đã cập nhật tài khoản ' }, { text: `"${this.editName}" (@${this.editUsername})`, bold: true }, { text: ' thành công' }]);
    } else {
      // Create is handled in another way or not implemented in backend, we'll keep local behavior
      this.accounts.unshift({
        id: Date.now(),
        name,
        username: this.editUsername.trim(),
        email: this.editEmail.trim(),
        phone: this.editPhone.trim(),
        address: this.editAddress.trim(),
        role: this.editRole,
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
        ...(this.editAvatarPreview ? { avatar: this.editAvatarPreview } : {}),
      });
      this.showToast('success', 'Đã tạo tài khoản mới');
      // For a real app, we should POST to backend.
    }
    this.closeEditModal();
    this.filterTable();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editAvatarPreview = '';
    this.editAvatarFile = null;
  }

  openDeleteFromEdit(): void {
    this.deleteTargetName = `"${this.editName}" (@${this.editUsername})`;
    this.showEditModal = false;
    this.editAvatarPreview = '';
    this.editAvatarFile = null;
    this.showDeleteModal = true;
  }

  openDelete(acc: Account): void {
    this.targetId = acc.id;
    this.deleteTargetName = `"${acc.name}" (@${acc.username})`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.targetId == null) return;
    const name = this.deleteTargetName;
    this.accounts = this.accounts.filter((a) => a.id !== this.targetId);
    this.selectedIds.delete(this.targetId);
    
    // Sync with backend
    const token = localStorage.getItem('token');
    if (token && this.targetId) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.delete(`http://localhost:3002/api/admin/users/${this.targetId}`, { headers }).subscribe({
        next: () => console.log('User deleted from DB'),
        error: (err) => console.error('Failed to delete user', err)
      });
    }

    this.showDeleteModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToastWithBold('danger', [{ text: 'Đã xoá tài khoản ' }, { text: name, bold: true }]);
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  openLock(acc: Account, action: 'lock' | 'unlock'): void {
    this.targetId = acc.id;
    this.lockAction = action;
    const isLock = action === 'lock';
    this.lockTitle = isLock ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?';
    this.lockSub = isLock ? 'Người dùng sẽ không thể đăng nhập.' : 'Người dùng sẽ có thể đăng nhập trở lại.';
    this.lockTargetName = `"${acc.name}" (@${acc.username})`;
    this.lockText = isLock ? 'khoá' : 'mở khoá';
    this.lockConfirmText = isLock ? 'Khoá tài khoản' : 'Mở khoá';
    this.lockConfirmClass = isLock ? 'btn-warn' : 'btn-vip';
    this.showLockModal = true;
  }

  confirmLock(): void {
    if (this.targetId == null) return;
    const name = this.lockTargetName;
    const acc = this.accounts.find((a) => a.id === this.targetId)!;
    
    // Attempt local update
    acc.status = this.lockAction === 'lock' ? 'locked' : 'active';
    
    // In real app, call PUT /api/admin/users/:id
    const token = localStorage.getItem('token');
    if (token && this.targetId) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      // Using generic update since status isn't individually exposed, but depends on backend support
      this.http.put(`http://localhost:3002/api/admin/users/${this.targetId}`, { status: acc.status }, { headers }).subscribe();
    }
    
    this.showLockModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToastWithBold('warn', [
      { text: this.lockAction === 'lock' ? 'Đã khoá tài khoản ' : 'Đã mở khoá tài khoản ' },
      { text: name, bold: true },
    ]);
  }

  closeLockModal(): void {
    this.showLockModal = false;
  }

  openVip(acc: Account): void {
    this.targetId = acc.id;
    this.vipTargetName = `"${acc.name}" (@${acc.username})`;
    this.showVipModal = true;
  }

  confirmVip(): void {
    if (this.targetId == null) return;
    const acc = this.accounts.find((a) => a.id === this.targetId)!;
    acc.role = 'vip customer';
    // Sync with backend
    const token = localStorage.getItem('token');
    if (token && typeof this.targetId === 'string') {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.put(`http://localhost:3002/api/admin/users/${this.targetId}/role`, { role: 'vip customer' }, { headers }).subscribe({
        next: () => console.log('Role updated on server'),
        error: (err) => console.error('Failed to update role on server', err)
      });
    }

    this.showVipModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToastWithBold('vip', [
      { text: 'Đã nâng cấp VIP ' },
      { text: this.vipDuration, bold: true },
      { text: ' cho ' },
      { text: `"${acc.name}" (@${acc.username})`, bold: true },
      { text: ' thành công' },
    ]);
  }

  closeVipModal(): void {
    this.showVipModal = false;
  }

  bulkVip(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
    
    this.selectedIds.forEach((id) => {
      const a = this.accounts.find((x) => x.id === id);
      if (a) {
        a.role = 'vip customer';
        // Sync with backend
        if (headers && typeof id === 'string') {
          this.http.put(`http://localhost:3002/api/admin/users/${id}/role`, { role: 'vip customer' }, { headers }).subscribe();
        }
      }
    });
    
    const n = this.selectedIds.size;
    this.selectedIds.clear();
    this.filterTable();
    this.showToastWithBold('vip', [
      { text: 'Đã nâng VIP ' },
      { text: String(n), bold: true },
      { text: ' tài khoản' },
    ]);
  }

  bulkLock(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.selectedIds.forEach((id) => {
      const a = this.accounts.find((x) => x.id === id);
      if (a) {
        a.status = 'locked';
        // Sync with backend
        if (headers && id) {
          this.http.put(`http://localhost:3002/api/admin/users/${id}`, { status: 'locked' }, { headers }).subscribe();
        }
      }
    });

    const n = this.selectedIds.size;
    this.selectedIds.clear();
    this.filterTable();
    this.showToastWithBold('warn', [
      { text: 'Đã khoá ' },
      { text: String(n), bold: true },
      { text: ' tài khoản' },
    ]);
  }

  bulkDelete(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    if (headers) {
      this.selectedIds.forEach((id) => {
        if (id) {
          this.http.delete(`http://localhost:3002/api/admin/users/${id}`, { headers }).subscribe();
        }
      });
    }

    const count = this.selectedIds.size;
    this.accounts = this.accounts.filter((a) => !this.selectedIds.has(a.id));
    this.selectedIds.clear();
    this.filterTable();
    this.showToastWithBold('danger', [
      { text: 'Đã xoá ' },
      { text: String(count), bold: true },
      { text: ' tài khoản' },
    ]);
  }

  async exportExcel(): Promise<void> {
    const data = this.filteredAccounts.length ? this.filteredAccounts : this.accounts;
    if (!data.length) {
      this.showAlertModal('Không có tài khoản để xuất!');
      return;
    }
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      return;
    }
    const workbook = new ExcelJSLib.Workbook();
    const sheet = workbook.addWorksheet('Danh sách tài khoản', { views: [{ state: 'frozen', ySplit: 1 }] });
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Họ tên', key: 'name', width: 22 },
      { header: 'Username', key: 'username', width: 16 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Vai trò', key: 'role', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Số điện thoại', key: 'phone', width: 14 },
      { header: 'Địa chỉ', key: 'address', width: 24 },
      { header: 'Ngày tạo', key: 'createdAt', width: 14 },
    ];
    sheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    for (const a of data) {
      sheet.addRow({
        id: a.id,
        name: a.name || '',
        username: a.username || '',
        email: a.email || '',
        role: a.role,
        status: a.status,
        phone: a.phone || '',
        address: a.address || '',
        createdAt: a.createdAt || '',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    saveAsLib(new Blob([buffer]), `Tai_khoan_${today}.xlsx`);
    this.showAlertModal('Đã xuất danh sách tài khoản ra file Excel thành công.');
  }

  showAlertModal(message: string): void {
    this.alertMessage = message;
    this.showAlert = true;
    this.cdr.detectChanges();
  }

  closeAlertModal(): void {
    this.showAlert = false;
    this.cdr.detectChanges();
  }

  closeAlertOnOverlay(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) this.closeAlertModal();
  }

  getToastIconSrc(type: string): string {
    return this.toastIconSrc[type] || this.toastIconSrc['success'];
  }

  showToast(type: string, message: string): void {
    this.toasts.push({ type, message });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.message !== message);
      this.cdr.detectChanges();
    }, 2800);
  }

  showToastWithBold(type: string, segments: { text: string; bold?: boolean }[]): void {
    const payload = { type, segments };
    this.toasts.push(payload);
    this.cdr.detectChanges();
    const key = segments.map((s) => s.text).join('');
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => !t.segments || t.segments.map((s) => s.text).join('') !== key);
      this.cdr.detectChanges();
    }, 2800);
  }

  removeToast(index: number): void {
    this.toasts.splice(index, 1);
  }
}
