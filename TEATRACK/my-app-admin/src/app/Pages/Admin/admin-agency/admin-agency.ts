import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface Agency {
  _id: string;
  name: string;
  address: string;
  phone: string;
  status?: 'active' | 'inactive';
  createdAt?: string | Date;
  mapEmbed?: string;
  image?: string;
}

@Component({
  selector: 'app-admin-agency',
  standalone: false,
  templateUrl: './admin-agency.html',
  styleUrl: './admin-agency.css',
})
export class AdminAgency implements OnInit {
  private readonly API = 'http://localhost:3002/api/agencies';
  private readonly LS_KEY = 'admin_agencies';

  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];
  searchQuery = '';
  cityFilter = '';
  statusFilter = '';

  selectedIds = new Set<string>();
  allSelected = false;

  pageSize = 10;
  currentPage = 1;
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAgencies.length / this.pageSize));
  }
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  get paginationInfo(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredAgencies.length);
    return `${start}-${end} / ${this.filteredAgencies.length}`;
  }

  get cityCount(): number {
    const cities = new Set(
      this.agencies.map((a) => this.getCityLabel(a.address)).filter(Boolean)
    );
    return cities.size;
  }

  showEditModal = false;
  editModalTitle = 'Thêm chi nhánh';
  editModalSub = 'Điền thông tin chi nhánh.';
  editingId: string | null = null;
  editName = '';
  editAddress = '';
  editPhone = '';
  editStatus: 'active' | 'inactive' = 'active';
  editMapEmbed = '';
  editImage = '';

  showMapModal = false;
  mapTarget: Agency | null = null;

  showDeleteModal = false;
  deleteTarget: Agency | null = null;
  get deleteTargetName(): string {
    return this.deleteTarget ? this.getAgencyDisplayName(this.deleteTarget) : '';
  }

  toasts: { type: string; message: string }[] = [];
  showAlert = false;
  alertMessage = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadAgencies();
  }

  loadAgencies(): void {
    this.http.get<Agency[]>(this.API).subscribe({
      next: (data) => {
        this.agencies = (data || []).map((a) => this.normalizeAgency(a));
        if (!this.agencies.length) {
          try {
            const stored = localStorage.getItem(this.LS_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as Agency[];
              if (Array.isArray(parsed)) this.agencies = parsed;
            }
          } catch (_) {}
        }
        if (!this.agencies.length) this.agencies = this.getSeedAgencies();
        this.persist();
        this.filterTable();
        this.cdr.detectChanges();
      },
      error: () => {
        try {
          const stored = localStorage.getItem(this.LS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as Agency[];
            if (Array.isArray(parsed)) this.agencies = parsed;
          }
        } catch (_) {}
        if (!this.agencies.length) this.agencies = this.getSeedAgencies();
        this.persist();
        this.filterTable();
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeAgency(a: any): Agency {
    return {
      _id: a._id || `agency_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: String(a.name ?? ''),
      address: String(a.address ?? ''),
      phone: String(a.phone ?? ''),
      status: a.status === 'inactive' ? 'inactive' : 'active',
      createdAt: a.createdAt || new Date().toISOString(),
      mapEmbed: a.mapEmbed || '',
      image: a.image || '/assets/icons/chi_nhanh1.png',
    };
  }

  private getSeedAgencies(): Agency[] {
    return [
      {
        _id: 'seed_1',
        name: '244 đường số 8 - H071',
        address: '244 Đường Số 8, Linh Xuân, Thủ Đức',
        phone: '0999.888.777',
        status: 'active',
        createdAt: new Date().toISOString(),
        mapEmbed: '',
        image: '/assets/icons/chi_nhanh1.png',
      },
      {
        _id: 'seed_2',
        name: 'Bình Dương - BD01',
        address: 'Khu công nghiệp Bình Dương',
        phone: '0988.777.666',
        status: 'active',
        createdAt: new Date().toISOString(),
        mapEmbed: '',
        image: '/assets/icons/chi_nhanh1.png',
      },
    ];
  }

  private persist(): void {
    // Không dùng LocalStorage để tránh không đồng bộ với DB
    try {
      localStorage.removeItem(this.LS_KEY);
    } catch (_) {}
  }

  onSearchInput(value: string): void {
    this.searchQuery = value ?? '';
    this.filterTable();
  }

  onCityFilter(value: string): void {
    this.cityFilter = value ?? '';
    this.filterTable();
  }

  onStatusFilter(value: string): void {
    this.statusFilter = value ?? '';
    this.filterTable();
  }

  filterTable(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const city = this.cityFilter.toLowerCase();
    const status = this.statusFilter.toLowerCase();
    this.filteredAgencies = this.agencies.filter((a) => {
      const matchSearch =
        !q ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.address || '').toLowerCase().includes(q) ||
        this.getCode(a.name).toLowerCase().includes(q);
      const matchCity =
        !city || this.getCityLabel(a.address).toLowerCase().replace(/\s+/g, '-') === city;
      const matchStatus = !status || (a.status || 'active') === status;
      return matchSearch && matchCity && matchStatus;
    });
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  getAgencyDisplayName(agency: Agency): string {
    const name = agency?.name || '';
    const part = name.split('-')[0];
    return (part || name).trim();
  }

  getCode(name: string): string {
    const parts = (name || '').split('-');
    return parts.length > 1 ? parts.slice(1).join('-').trim() : '';
  }

  getCityLabel(address: string): string {
    if (!address) return '';
    if (address.includes('Thủ Đức') || address.toLowerCase().includes('thu duc')) return 'Thủ Đức';
    if (address.includes('Bình Dương') || address.toLowerCase().includes('binh duong'))
      return 'Bình Dương';
    return 'Khác';
  }

  getCityBadgeClass(address: string): string {
    const label = this.getCityLabel(address);
    if (label === 'Thủ Đức') return 'badge-city-thu-duc';
    if (label === 'Bình Dương') return 'badge-city-binh-duong';
    return 'badge-city-other';
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      const onPage = this.filteredAgencies
        .slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize)
        .map((a) => a._id);
      onPage.forEach((id) => this.selectedIds.add(id));
    } else {
      this.filteredAgencies.forEach((a) => this.selectedIds.delete(a._id));
    }
    this.allSelected = checked;
    this.cdr.detectChanges();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleRow(id: string, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.cdr.detectChanges();
  }

  async bulkDeactivate(): Promise<void> {
    const ids = Array.from(this.selectedIds);
    for (const id of ids) {
       await this.http.put(`${this.API}/${id}`, { status: 'inactive' }).toPromise();
    }
    this.loadAgencies(); // Reload all
    this.selectedIds.clear();
    this.toast('success', `Đã tạm ngưng ${ids.length} chi nhánh đã chọn.`);
    this.cdr.detectChanges();
  }

  async bulkDelete(): Promise<void> {
    const ids = Array.from(this.selectedIds);
    if (!confirm(`Bạn có chắc muốn xoá ${ids.length} chi nhánh đã chọn?`)) return;
    
    for (const id of ids) {
       await this.http.delete(`${this.API}/${id}`).toPromise();
    }
    this.loadAgencies(); // Reload all
    this.selectedIds.clear();
    this.toast('success', `Đã xoá ${ids.length} chi nhánh đã chọn.`);
    this.cdr.detectChanges();
  }

  openCreate(): void {
    this.editingId = null;
    this.editModalTitle = 'Thêm chi nhánh';
    this.editModalSub = 'Điền thông tin chi nhánh mới.';
    this.editName = '';
    this.editAddress = '';
    this.editPhone = '';
    this.editStatus = 'active';
    this.editMapEmbed = '';
    this.editImage = '';
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  openEdit(agency: Agency): void {
    this.editingId = agency._id;
    this.editModalTitle = 'Chỉnh sửa chi nhánh';
    this.editModalSub = 'Cập nhật thông tin.';
    this.editName = agency.name || '';
    this.editAddress = agency.address || '';
    this.editPhone = agency.phone || '';
    this.editStatus = agency.status || 'active';
    this.editMapEmbed = agency.mapEmbed || '';
    this.editImage = agency.image || '/assets/icons/chi_nhanh1.png';
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingId = null;
    this.cdr.detectChanges();
  }

  onAgencyImageFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editImage = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearAgencyImage(): void {
    this.editImage = '';
    this.cdr.detectChanges();
  }

  onAgencyImageError(): void {
    this.editImage = '/assets/icons/chi_nhanh1.png';
    this.cdr.detectChanges();
  }

  saveEdit(): void {
    const name = this.editName.trim();
    if (!name) {
      this.toast('error', 'Vui lòng nhập tên chi nhánh.');
      return;
    }
    const payload: any = {
      name,
      address: this.editAddress.trim(),
      phone: this.editPhone.trim(),
      status: this.editStatus,
      mapEmbed: this.editMapEmbed.trim() || undefined,
      image: this.editImage.trim() || undefined,
    };
    
    if (this.editingId) {
      this.http.put<Agency[]>(`${this.API}/${this.editingId}`, payload).subscribe({
        next: (data) => {
          this.agencies = (data || []).map(a => this.normalizeAgency(a));
          this.filterTable();
          this.closeEditModal();
          this.toast('success', 'Đã cập nhật chi nhánh.');
          this.cdr.detectChanges();
        },
        error: () => this.toast('error', 'Lỗi cập nhật chi nhánh.')
      });
    } else {
      this.http.post<Agency[]>(this.API, payload).subscribe({
        next: (data) => {
          this.agencies = (data || []).map(a => this.normalizeAgency(a));
          this.filterTable();
          this.closeEditModal();
          this.toast('success', 'Đã thêm chi nhánh.');
          this.cdr.detectChanges();
        },
        error: () => this.toast('error', 'Lỗi thêm chi nhánh.')
      });
    }
  }

  openDetail(_agency: Agency): void {}

  openMap(agency: Agency): void {
    this.mapTarget = agency;
    this.showMapModal = true;
    this.cdr.detectChanges();
  }

  closeMapModal(): void {
    this.showMapModal = false;
    this.mapTarget = null;
    this.cdr.detectChanges();
  }

  getSafeMapUrl(url: string | undefined): SafeResourceUrl {
    if (!url || !url.trim()) return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  toggleStatus(agency: Agency): void {
    const newStatus = agency.status === 'active' ? 'inactive' : 'active';
    this.http.put<Agency[]>(`${this.API}/${agency._id}`, { status: newStatus }).subscribe({
      next: (data) => {
        this.agencies = (data || []).map(a => this.normalizeAgency(a));
        this.filterTable();
        this.toast('success', newStatus === 'active' ? 'Đã kích hoạt.' : 'Đã tạm ngưng.');
        this.cdr.detectChanges();
      },
      error: () => this.toast('error', 'Lỗi thay đổi trạng thái.')
    });
  }

  openDelete(agency: Agency): void {
    this.deleteTarget = agency;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.http.delete<Agency[]>(`${this.API}/${this.deleteTarget._id}`).subscribe({
      next: (data) => {
        this.agencies = (data || []).map(a => this.normalizeAgency(a));
        this.filterTable();
        this.closeDeleteModal();
        this.toast('success', 'Đã xoá chi nhánh.');
        this.cdr.detectChanges();
      },
      error: () => this.toast('error', 'Lỗi xoá chi nhánh.')
    });
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
    this.cdr.detectChanges();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
    this.cdr.detectChanges();
  }

  goToPage(p: number): void {
    this.currentPage = Math.max(1, Math.min(p, this.totalPages));
    this.cdr.detectChanges();
  }

  getPagedAgencies(): Agency[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAgencies.slice(start, start + this.pageSize);
  }

  async exportExcel(): Promise<void> {
    if (!this.filteredAgencies.length) {
      this.showAlertModal('Không có chi nhánh để xuất!');
      return;
    }
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      this.cdr.detectChanges();
      return;
    }
    const workbook = new ExcelJSLib.Workbook();
    const sheet = workbook.addWorksheet('Danh sách chi nhánh', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };
    sheet.columns = [
      { header: 'Tên', key: 'name', width: 22 },
      { header: 'Mã CN', key: 'code', width: 12 },
      { header: 'Địa chỉ', key: 'address', width: 28 },
      { header: 'Số điện thoại', key: 'phone', width: 14 },
      { header: 'Khu vực', key: 'city', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 14 },
    ];
    sheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    for (const a of this.filteredAgencies) {
      sheet.addRow({
        name: a.name || '',
        code: this.getCode(a.name),
        address: a.address || '',
        phone: a.phone || '',
        city: this.getCityLabel(a.address),
        status: a.status === 'active' ? 'Hoạt động' : 'Tạm ngưng',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    saveAsLib(new Blob([buffer]), `Chi_nhanh_${today}.xlsx`);
    this.showAlertModal('Đã xuất danh sách chi nhánh ra file Excel thành công.');
    this.cdr.detectChanges();
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

  toast(type: string, message: string): void {
    this.toasts.push({ type, message });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.message !== message);
      this.cdr.detectChanges();
    }, 3000);
  }

  removeToast(t: { type: string; message: string }): void {
    this.toasts = this.toasts.filter((x) => x !== t);
    this.cdr.detectChanges();
  }

  trackToast(index: number, t: { type: string; message: string }): string {
    return `${index}-${t.message}`;
  }
}
