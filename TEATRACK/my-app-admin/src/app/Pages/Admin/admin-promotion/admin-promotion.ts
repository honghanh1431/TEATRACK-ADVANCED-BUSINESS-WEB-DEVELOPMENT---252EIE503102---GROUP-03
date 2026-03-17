import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export type VoucherType = 'amount' | 'percent' | 'perItem';

export interface VoucherRow {
  _id?: string;
  code: string;
  type: VoucherType;
  value: number;
  minSubtotal?: number;
  max?: number;
  description: string;
  isActive?: boolean;
}

interface ToastItem {
  id: string;
  type: 'ok' | 'err';
  title: string;
  sub?: string;
  closing?: boolean;
}

import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-admin-promotion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-promotion.html',
  styleUrls: ['./admin-promotion.css'],
})
export class AdminPromotion implements OnInit {
  private readonly API_URL = 'http://localhost:3002/api/promotions';
  private socket: Socket | undefined;

  stats = {
    total: 0,
    amount: 0,
    percent: 0,
    perItem: 0,
  };

  q = '';
  typeFilter: '' | VoucherType = '';

  vouchersAll: VoucherRow[] = [];
  filtered: VoucherRow[] = [];
  page = 1;
  pageSize = 10;

  modalOpen = false;
  editing = false;
  editingId = '';

  form!: FormGroup;

  deleteOpen = false;
  deleteTarget: VoucherRow | null = null;

  showAlert = false;
  alertMessage = '';
  toasts: ToastItem[] = [];

  verifyOpen = false;
  verifyTarget: VoucherRow | null = null;
  verifyAction = '';

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('promotionUpdated', () => {
      this.load();
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
      type: ['amount', [Validators.required]],
      value: [0, [Validators.required, Validators.min(1)]],
      minSubtotal: [null as number | null],
      max: [null as number | null],
      description: ['', [Validators.required]],
      isActive: [true],
    });
    this.load();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedList(): VoucherRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  goPage(n: number): void {
    this.page = Math.max(1, Math.min(n, this.totalPages));
  }

  onSearch(v: string): void {
    this.q = (v ?? '').trim();
    this.applyFilters();
  }

  onTypeFilter(v: string): void {
    this.typeFilter = (v as '' | VoucherType) || '';
    this.applyFilters();
  }

  get headers() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  private load(): void {
    this.http.get<VoucherRow[]>(`${this.API_URL}/admin`, this.headers).subscribe({
      next: (data) => {
        this.vouchersAll = data || [];
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load promotions error:', err);
        this.toast('err', 'Lỗi', 'Không thể tải danh sách mã giảm giá từ server.');
      },
    });
  }

  private computeStats(): void {
    this.stats.total = this.vouchersAll.length;
    this.stats.amount = this.vouchersAll.filter((v) => v.type === 'amount').length;
    this.stats.percent = this.vouchersAll.filter((v) => v.type === 'percent').length;
    this.stats.perItem = this.vouchersAll.filter((v) => v.type === 'perItem').length;
  }

  private applyFilters(): void {
    const q = this.q.toLowerCase();
    this.filtered = this.vouchersAll.filter((v) => {
      const okType = !this.typeFilter || v.type === this.typeFilter;
      const okQuery = !q || v.code.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q);
      return okType && okQuery;
    });
    this.page = Math.min(this.page, this.totalPages || 1);
    this.cdr.detectChanges();
  }

  typeLabel(t: VoucherType): string {
    if (t === 'amount') return 'Giảm theo số tiền';
    if (t === 'percent') return 'Giảm theo %';
    return 'Giảm theo món';
  }

  openAdd(): void {
    this.editing = false;
    this.editingId = '';
    this.form.reset({
      code: '',
      type: 'amount',
      value: 0,
      minSubtotal: null,
      max: null,
      description: '',
      isActive: true,
    });
    this.form.get('code')?.enable();
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(v: VoucherRow): void {
    this.editing = true;
    this.editingId = v._id || '';
    this.form.reset({
      code: v.code,
      type: v.type,
      value: v.value,
      minSubtotal: v.minSubtotal ?? null,
      max: v.max ?? null,
      description: v.description,
      isActive: v.isActive !== false,
    });
    this.form.get('code')?.enable();
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  tryCloseModal(): void {
    this.modalOpen = false;
    this.editing = false;
    this.editingId = '';
    this.cdr.detectChanges();
  }

  backdropClose(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('account-modal-overlay')) {
      this.tryCloseModal();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast('err', 'Thiếu thông tin', 'Vui lòng nhập đủ mã, loại, giá trị và mô tả.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      code: String(raw.code ?? '').trim().toUpperCase(),
      type: (raw.type === 'percent' ? 'percent' : raw.type === 'perItem' ? 'perItem' : 'amount') as VoucherType,
      value: Number(raw.value) || 0,
      minSubtotal: raw.minSubtotal != null && raw.minSubtotal !== '' ? Number(raw.minSubtotal) : 0,
      max: raw.max != null && raw.max !== '' ? Number(raw.max) : null,
      description: String(raw.description ?? '').trim(),
      isActive: !!raw.isActive,
    };

    if (this.editing && this.editingId) {
      this.http.put(`${this.API_URL}/${this.editingId}`, payload, this.headers).subscribe({
        next: () => {
          this.load();
          this.tryCloseModal();
          this.showSuccess('CẬP NHẬT VOUCHER THÀNH CÔNG');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.toast('err', 'Lỗi', err.error?.message || 'Không thể cập nhật voucher.');
        }
      });
      return;
    }

    this.http.post(this.API_URL, payload, this.headers).subscribe({
      next: () => {
        this.load();
        this.tryCloseModal();
        this.showSuccess('THÊM VOUCHER THÀNH CÔNG');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast('err', 'Lỗi', err.error?.message || 'Không thể thêm voucher.');
      }
    });
  }

  changeDetect(): void {
    this.cdr.detectChanges();
  }

  toggleStatus(v: VoucherRow): void {
    if (!v._id) return;
    this.verifyTarget = v;
    this.verifyAction = v.isActive === false ? 'Kích hoạt' : 'Vô hiệu hóa';
    this.verifyOpen = true;
    this.cdr.detectChanges();
  }

  closeVerify(): void {
    this.verifyOpen = false;
    this.verifyTarget = null;
    this.verifyAction = '';
    this.cdr.detectChanges();
  }

  confirmVerify(): void {
    if (!this.verifyTarget || !this.verifyTarget._id) return;
    const v = this.verifyTarget;
    const nextActive = v.isActive === false;

    this.http.put(`${this.API_URL}/${v._id}`, { isActive: nextActive }, this.headers).subscribe({
      next: () => {
        v.isActive = nextActive;
        this.toast('ok', 'Cập nhật thành công', `Mã ${v.code} hiện tại là: ${nextActive ? 'Kích hoạt' : 'Không kích hoạt'}`);
        this.closeVerify();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast('err', 'Lỗi', err.error?.message || 'Không thể cập nhật trạng thái.');
        this.closeVerify();
      }
    });
  }

  openDelete(v: VoucherRow): void {
    this.deleteTarget = v;
    this.deleteOpen = true;
  }

  closeDelete(): void {
    this.deleteOpen = false;
    this.deleteTarget = null;
  }

  backdropCloseDelete(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('account-modal-overlay')) {
      this.closeDelete();
    }
  }

  confirmDelete(): void {
    if (!this.deleteTarget || !this.deleteTarget._id) return;
    
    this.http.delete(`${this.API_URL}/${this.deleteTarget._id}`, this.headers).subscribe({
      next: () => {
        this.load();
        this.closeDelete();
        this.showSuccess('XÓA VOUCHER THÀNH CÔNG');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast('err', 'Lỗi', err.error?.message || 'Không thể xóa voucher.');
      }
    });
  }

  showSuccess(message = 'THÀNH CÔNG'): void {
    const modal = document.getElementById('modal-success-promotion');
    const messageEl = document.getElementById('success-message-promotion');
    if (!modal) return;
    if (messageEl) messageEl.textContent = message;
    (modal as HTMLElement).style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }

  hideSuccess(): void {
    const modal = document.getElementById('modal-success-promotion');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
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
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) {
      this.closeAlertModal();
    }
  }

  toast(type: 'ok' | 'err', title: string, sub?: string): void {
    const t: ToastItem = {
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      title,
      sub,
    };
    this.toasts = [t, ...this.toasts];
    this.cdr.detectChanges();
    setTimeout(() => this.removeToast(t.id), 2500);
  }

  removeToast(id: string): void {
    const x = this.toasts.find((t) => t.id === id);
    if (!x || x.closing) return;
    x.closing = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.cdr.detectChanges();
    }, 400);
  }

  trackToast(_index: number, t: ToastItem): string {
    return t.id;
  }

  /** Format số với dấu chấm phân cách hàng nghìn (VD: 80000 -> 80.000) */
  formatNumberWithDot(n: number | null | undefined): string {
    if (n == null || !Number.isFinite(n)) return '';
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  formatValue(v: VoucherRow): string {
    if (v.type === 'percent') return `${v.value}%`;
    return `${this.formatNumberWithDot(v.value)}đ`;
  }
}
