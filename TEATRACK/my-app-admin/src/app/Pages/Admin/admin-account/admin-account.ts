import { Component, ChangeDetectorRef, OnInit } from '@angular/core';

export interface Account {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'vip' | 'user';
  status: 'active' | 'locked';
  phone: string;
  address: string;
  createdAt: string;
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
  { id: 2, name: 'Nguyễn Thị Lan', username: 'lanngoc99', email: 'lan.nguyen@gmail.com', role: 'vip', status: 'active', phone: '0912345678', address: 'Hà Nội', createdAt: '2026-01-15' },
  { id: 3, name: 'Trần Minh Hoàng', username: 'hoangTM', email: 'hoang.tran@yahoo.com', role: 'user', status: 'active', phone: '0987654321', address: 'TP.HCM', createdAt: '2026-01-20' },
  { id: 4, name: 'Phạm Thu Hà', username: 'thuha2k', email: 'thuha@outlook.com', role: 'user', status: 'locked', phone: '0911222333', address: 'Đà Nẵng', createdAt: '2026-02-01' },
  { id: 5, name: 'Lê Văn Đức', username: 'duc.le', email: 'duc.le@teatrack.com', role: 'admin', status: 'active', phone: '0933111222', address: 'Hải Phòng', createdAt: '2026-02-05' },
  { id: 6, name: 'Bùi Khánh Linh', username: 'klinh_bui', email: 'klinh@gmail.com', role: 'vip', status: 'active', phone: '0944555666', address: 'Cần Thơ', createdAt: '2026-02-10' },
  { id: 7, name: 'Võ Quốc Bảo', username: 'baovq', email: 'bao.vo@email.com', role: 'user', status: 'locked', phone: '0922333444', address: 'Nha Trang', createdAt: '2026-02-14' },
  { id: 8, name: 'Đặng Thị Mai', username: 'mai.dang', email: 'mai.dang@gmail.com', role: 'user', status: 'active', phone: '0955777888', address: 'Huế', createdAt: '2026-02-18' },
  { id: 9, name: 'Hồ Thanh Tùng', username: 'tunght', email: 'tung.ho@gmail.com', role: 'vip', status: 'active', phone: '0966888999', address: 'TP.HCM', createdAt: '2026-02-22' },
  { id: 10, name: 'Ngô Quỳnh Anh', username: 'quinhanh', email: 'quynhanh@email.com', role: 'user', status: 'active', phone: '0977999000', address: 'Hà Nội', createdAt: '2026-03-01' },
];

@Component({
  selector: 'app-admin-account',
  standalone: false,
  templateUrl: './admin-account.html',
  styleUrl: './admin-account.css',
})
export class AdminAccount implements OnInit {
  accounts: Account[] = [...MOCK_ACCOUNTS];
  filteredAccounts: Account[] = [];
  selectedIds = new Set<number>();

  searchQuery = '';
  roleFilter = '';
  statusFilter = '';

  showEditModal = false;
  showDeleteModal = false;
  showLockModal = false;
  showVipModal = false;
  showAlert = false;
  alertMessage = '';

  targetId: number | null = null;
  lockAction: 'lock' | 'unlock' = 'lock';

  editModalTitle = 'Chỉnh sửa tài khoản';
  editModalSub = 'Cập nhật thông tin người dùng';
  editName = '';
  editUsername = '';
  editEmail = '';
  editPhone = '';
  editAddress = '';
  editRole: 'admin' | 'vip' | 'user' = 'user';

  deleteTargetName = '';
  lockTitle = 'Khoá tài khoản?';
  lockSub = 'Người dùng sẽ không thể đăng nhập.';
  lockText = '';
  lockTargetName = '';
  lockConfirmText = '🔒 Khoá tài khoản';
  lockConfirmClass = 'btn-warn';
  vipTargetName = '';
  vipDuration = '6 tháng';

  toasts: { type: string; message: string }[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.filterTable();
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

  isSelected(id: number): boolean {
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

  toggleRow(id: number, checked: boolean): void {
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
    this.editModalTitle = 'Thêm tài khoản mới';
    this.editModalSub = 'Điền thông tin để tạo tài khoản';
    this.editName = '';
    this.editUsername = '';
    this.editEmail = '';
    this.editPhone = '';
    this.editAddress = '';
    this.editRole = 'user';
    this.targetId = null;
    this.showEditModal = true;
  }

  openEdit(acc: Account): void {
    this.targetId = acc.id;
    this.editModalTitle = 'Chỉnh sửa tài khoản';
    this.editModalSub = `Cập nhật thông tin của @${acc.username}`;
    this.editName = acc.name;
    this.editUsername = acc.username;
    this.editEmail = acc.email;
    this.editPhone = acc.phone;
    this.editAddress = acc.address;
    this.editRole = acc.role;
    this.showEditModal = true;
  }

  saveEdit(): void {
    const name = this.editName.trim();
    if (!name) {
      this.showToast('error', '⚠️ Vui lòng nhập họ tên');
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
      this.showToast('success', '✅ Đã cập nhật tài khoản thành công');
    } else {
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
      });
      this.showToast('success', '✅ Đã tạo tài khoản mới');
    }
    this.closeEditModal();
    this.filterTable();
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  openDelete(acc: Account): void {
    this.targetId = acc.id;
    this.deleteTargetName = `"${acc.name}" (@${acc.username})`;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.targetId == null) return;
    this.accounts = this.accounts.filter((a) => a.id !== this.targetId);
    this.selectedIds.delete(this.targetId);
    this.showDeleteModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToast('success', '🗑 Đã xoá tài khoản');
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
    this.lockConfirmText = isLock ? '🔒 Khoá tài khoản' : '🔓 Mở khoá';
    this.lockConfirmClass = isLock ? 'btn-warn' : 'btn-vip';
    this.showLockModal = true;
  }

  confirmLock(): void {
    if (this.targetId == null) return;
    const acc = this.accounts.find((a) => a.id === this.targetId)!;
    acc.status = this.lockAction === 'lock' ? 'locked' : 'active';
    this.showLockModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToast(this.lockAction === 'lock' ? 'warn' : 'success', this.lockAction === 'lock' ? '🔒 Đã khoá tài khoản' : '🔓 Đã mở khoá tài khoản');
  }

  closeLockModal(): void {
    this.showLockModal = false;
  }

  openVip(acc: Account): void {
    this.targetId = acc.id;
    this.vipTargetName = `"${acc.name}"`;
    this.showVipModal = true;
  }

  confirmVip(): void {
    if (this.targetId == null) return;
    const acc = this.accounts.find((a) => a.id === this.targetId)!;
    acc.role = 'vip';
    this.showVipModal = false;
    this.targetId = null;
    this.filterTable();
    this.showToast('success', `💎 Đã nâng cấp VIP ${this.vipDuration} cho "${acc.name}"`);
  }

  closeVipModal(): void {
    this.showVipModal = false;
  }

  bulkVip(): void {
    this.selectedIds.forEach((id) => {
      const a = this.accounts.find((x) => x.id === id);
      if (a) a.role = 'vip';
    });
    const n = this.selectedIds.size;
    this.selectedIds.clear();
    this.filterTable();
    this.showToast('success', `💎 Đã nâng VIP ${n} tài khoản`);
  }

  bulkLock(): void {
    this.selectedIds.forEach((id) => {
      const a = this.accounts.find((x) => x.id === id);
      if (a) a.status = 'locked';
    });
    const n = this.selectedIds.size;
    this.selectedIds.clear();
    this.filterTable();
    this.showToast('warn', `🔒 Đã khoá ${n} tài khoản`);
  }

  bulkDelete(): void {
    const count = this.selectedIds.size;
    this.accounts = this.accounts.filter((a) => !this.selectedIds.has(a.id));
    this.selectedIds.clear();
    this.filterTable();
    this.showToast('success', `🗑 Đã xoá ${count} tài khoản`);
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

  showToast(type: string, message: string): void {
    this.toasts.push({ type, message });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.message !== message);
      this.cdr.detectChanges();
    }, 2800);
  }

  removeToast(index: number): void {
    this.toasts.splice(index, 1);
  }
}
