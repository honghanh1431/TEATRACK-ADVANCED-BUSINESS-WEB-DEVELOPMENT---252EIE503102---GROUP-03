import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export type VoucherType = 'amount' | 'percent' | 'perItem';

export interface VoucherRow {
  code: string;
  type: VoucherType;
  value: number;
  minSubtotal?: number;
  max?: number;
  description: string;
}

interface ToastItem {
  id: string;
  type: 'ok' | 'err';
  title: string;
  sub?: string;
  closing?: boolean;
}

@Component({
  selector: 'app-admin-promotion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-promotion.html',
  styleUrls: ['./admin-promotion.css'],
})
export class AdminPromotion implements OnInit {
  readonly VOUCHER_STORAGE_KEY = 'ngogia_vouchers';
  private readonly DATA_URL = '/data/vouchers.json';

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
  editingCode = '';

  form!: FormGroup;

  deleteOpen = false;
  deleteTarget: VoucherRow | null = null;

  showAlert = false;
  alertMessage = '';
  toasts: ToastItem[] = [];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
      type: ['amount', [Validators.required]],
      value: [0, [Validators.required, Validators.min(1)]],
      minSubtotal: [null as number | null],
      max: [null as number | null],
      description: ['', [Validators.required]],
    });
    this.load();
    this.applyFilters();
    this.cdr.detectChanges();
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

  private load(): void {
    this.http.get<VoucherRow[]>(this.DATA_URL).subscribe({
      next: (data) => {
        let list = Array.isArray(data) ? data : [];
        try {
          const stored = localStorage.getItem(this.VOUCHER_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length) list = this.normalizeList(parsed);
          }
        } catch (_) {}
        this.vouchersAll = list;
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => {
        try {
          const stored = localStorage.getItem(this.VOUCHER_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) this.vouchersAll = this.normalizeList(parsed);
          }
        } catch (_) {}
        if (this.vouchersAll.length === 0) {
          this.vouchersAll = [
            { code: 'NGOGIAFS', type: 'amount', value: 10000, minSubtotal: 50000, description: 'Giảm 10.000đ cho đơn từ 50.000đ' },
            { code: 'NGOVIP15', type: 'percent', value: 15, minSubtotal: 80000, max: 40000, description: 'Giảm 15% tối đa 40.000đ cho đơn từ 80.000đ' },
            { code: '123456789', type: 'perItem', value: 3000, description: 'Giảm 3.000đ trên mỗi món trong giỏ hàng' },
          ];
          this.persist();
        }
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeList(arr: any[]): VoucherRow[] {
    return (arr || []).map((v) => ({
      code: String(v?.code ?? '').trim().toUpperCase(),
      type: (v?.type === 'percent' ? 'percent' : v?.type === 'perItem' ? 'perItem' : 'amount') as VoucherType,
      value: Number(v?.value) ?? 0,
      minSubtotal: v?.minSubtotal != null ? Number(v.minSubtotal) : undefined,
      max: v?.max != null ? Number(v.max) : undefined,
      description: String(v?.description ?? '').trim(),
    })).filter((v) => v.code);
  }

  private persist(): void {
    localStorage.setItem(this.VOUCHER_STORAGE_KEY, JSON.stringify(this.vouchersAll));
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
    this.editingCode = '';
    this.form.reset({
      code: '',
      type: 'amount',
      value: 0,
      minSubtotal: null,
      max: null,
      description: '',
    });
    this.form.get('code')?.enable();
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(v: VoucherRow): void {
    this.editing = true;
    this.editingCode = v.code;
    this.form.reset({
      code: v.code,
      type: v.type,
      value: v.value,
      minSubtotal: v.minSubtotal ?? null,
      max: v.max ?? null,
      description: v.description,
    });
    this.form.get('code')?.enable();
    this.modalOpen = true;
    this.cdr.detectChanges();
  }

  tryCloseModal(): void {
    this.modalOpen = false;
    this.editing = false;
    this.editingCode = '';
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
    const code = String(raw.code ?? '').trim().toUpperCase();
    const type = (raw.type === 'percent' ? 'percent' : raw.type === 'perItem' ? 'perItem' : 'amount') as VoucherType;
    const value = Number(raw.value) || 0;
    const minSubtotal = raw.minSubtotal != null && raw.minSubtotal !== '' ? Number(raw.minSubtotal) : undefined;
    const max = raw.max != null && raw.max !== '' ? Number(raw.max) : undefined;
    const description = String(raw.description ?? '').trim();

    if (this.editing && this.editingCode) {
      const idx = this.vouchersAll.findIndex((x) => x.code === this.editingCode);
      if (idx === -1) {
        this.toast('err', 'Lỗi', 'Không tìm thấy voucher.');
        return;
      }
      if (code !== this.editingCode && this.vouchersAll.some((x) => x.code === code)) {
        this.toast('err', 'Trùng mã', 'Mã voucher đã tồn tại.');
        return;
      }
      this.vouchersAll[idx] = { code, type, value, minSubtotal, max, description };
      this.persist();
      this.computeStats();
      this.applyFilters();
      this.tryCloseModal();
      this.showSuccess('CẬP NHẬT VOUCHER THÀNH CÔNG');
      this.cdr.detectChanges();
      return;
    }

    if (this.vouchersAll.some((x) => x.code === code)) {
      this.toast('err', 'Trùng mã', 'Mã voucher đã tồn tại.');
      return;
    }
    this.vouchersAll.push({ code, type, value, minSubtotal, max, description });
    this.persist();
    this.computeStats();
    this.applyFilters();
    this.tryCloseModal();
    this.showSuccess('THÊM VOUCHER THÀNH CÔNG');
    this.cdr.detectChanges();
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
    if (!this.deleteTarget) return;
    const code = this.deleteTarget.code;
    this.vouchersAll = this.vouchersAll.filter((v) => v.code !== code);
    this.persist();
    this.computeStats();
    this.applyFilters();
    this.closeDelete();
    this.showSuccess('XÓA VOUCHER THÀNH CÔNG');
    this.cdr.detectChanges();
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
