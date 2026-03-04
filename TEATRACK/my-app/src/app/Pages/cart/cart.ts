import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Payment } from '../payment/payment';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  sweetness?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  options?: string[];
  qty: number;
}

interface ShippingInfo {
  address: string;
  receiver: string;
  phone: string;
  deliveryDate: string;
  deliveryTime: string;
  time?: string;
  note?: string;
}

interface CouponData {
  code: string;
  amount: number;
  description: string;
  valid: boolean;
  message: string;
}

interface CouponRule {
  type: 'amount' | 'percent' | 'perItem';
  value: number;
  minSubtotal?: number;
  max?: number;
  description: string;
}

interface Totals {
  subtotal: number;
  shipping: number;
  discount: number;
  grand: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Payment],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css'],
})
export class Cart implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}
  // Storage keys
  private readonly STORAGE_KEY = 'cart_items';
  private readonly COUPON_KEY = 'ngogia_coupon';
  private readonly SHIPPING_KEY = 'ngogia_shipping';
  private readonly USER_KEY = 'ngogia_user';

  // Coupon rules
  private readonly couponRules: Record<string, CouponRule> = {
    NGOGIAFS: {
      type: 'amount',
      value: 10000,
      minSubtotal: 50000,
      description: 'Giảm 10.000d cho đơn từ 50.000d',
    },
    NGOVIP15: {
      type: 'percent',
      value: 15,
      minSubtotal: 80000,
      max: 40000,
      description: 'Giảm 15% tối đa 40.000d cho đơn từ 80.000d',
    },
    123456789: {
      type: 'perItem',
      value: 3000,
      description: 'Giảm 3.000đ trên mỗi món trong giỏ hàng',
    },
  };

  /** Giờ hiện tại dạng "HH:mm" (24h, 60 phút) */
  getCurrentTimeString(): string {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** 0–23 cho dropdown giờ */
  readonly hourOptions = Array.from({ length: 24 }, (_, i) => i);
  /** 0–59 cho dropdown phút */
  readonly minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  /** Giờ hiện tại (0–23) */
  get currentHour(): number {
    return new Date().getHours();
  }
  /** Phút hiện tại (0–59) */
  get currentMinute(): number {
    return new Date().getMinutes();
  }

  /** Ngày hôm nay dạng YYYY-MM-DD */
  get todayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /** Đang chọn đúng ngày hôm nay (để khóa giờ/phút đã qua) */
  get isTodaySelected(): boolean {
    const date = (this.modalData?.deliveryDate || '').trim();
    return date === this.todayDateString;
  }

  /** Giờ đang chọn trong modal (0–23) */
  get modalHour(): number {
    const t = (this.modalData?.deliveryTime || '').trim();
    const match = t.match(/^(\d{1,2})/);
    return match ? Math.min(23, Math.max(0, parseInt(match[1], 10))) : this.currentHour;
  }
  /** Phút đang chọn trong modal (0–59) */
  get modalMinute(): number {
    const t = (this.modalData?.deliveryTime || '').trim();
    const match = t.match(/:(\d{1,2})/);
    return match ? Math.min(59, Math.max(0, parseInt(match[1], 10))) : this.currentMinute;
  }

  setModalHour(h: number): void {
    const m = this.modalMinute;
    this.modalData = this.modalData || {};
    this.modalData.deliveryTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  setModalMinute(m: number): void {
    const h = this.modalHour;
    this.modalData = this.modalData || {};
    this.modalData.deliveryTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Format số 0–9 thành "00"-"09" cho hiển thị giờ/phút */
  padTime(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Khóa giờ đã qua khi chọn ngày hôm nay */
  isHourDisabled(h: number): boolean {
    return this.isTodaySelected && h < this.currentHour;
  }
  /** Khóa phút đã qua khi chọn hôm nay và đúng giờ hiện tại */
  isMinuteDisabled(m: number): boolean {
    if (!this.isTodaySelected) return false;
    if (this.modalHour < this.currentHour) return true;
    if (this.modalHour === this.currentHour) return m < this.currentMinute;
    return false;
  }

  readonly minDate = new Date().toISOString().split('T')[0];

  readonly paymentMethods = [
    { value: 'cash', label: 'Tiền mặt', checked: true },
    { value: 'momo', label: 'MoMo', checked: false },
    { value: 'zalopay', label: 'ZaloPay', checked: false },
    { value: 'ewallet', label: 'Ví điện tử', checked: false },
  ];

  readonly shippingFields = [
    { key: 'address', label: 'Địa chỉ giao hàng', value: '' },
    { key: 'receiver', label: 'Người nhận', value: '' },
    { key: 'time', label: 'Thời gian giao hàng', value: '' },
    { key: 'note', label: 'Ghi chú cho cửa hàng', value: '' },
  ];

  // Default shipping info
  private readonly defaultShipping: ShippingInfo = {
    address: '76C Luy 198C 3B, khu pho 3, Thu Duc, TP. Ho Chi Minh, Viet Nam',
    receiver: 'Nguyen Ba Du',
    phone: '0123 456 789',
    deliveryDate: '2025-10-29',
    deliveryTime: '19:30',
    note: 'Ghi chu: Quan de ly 2 voi 2 ben rieng giup nhe!',
  };

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // Xử lý đường dẫn ảnh
    return '/' + imagePath.replace(/^\//, '');
  }

  // State variables
  cartItems: CartItem[] = [];
  shippingInfo: ShippingInfo = { ...this.defaultShipping };
  selectedPayment = 'cash';

  /** Map selectedPayment sang method cho app-payment (ewallet -> payoo). */
  get paymentMethodForDisplay(): string {
    return this.selectedPayment === 'ewallet' ? 'payoo' : this.selectedPayment;
  }
  /** True khi đang chọn MoMo / ZaloPay / Ví điện tử (có QR, bật timer giả lập scan). */
  get isNonCashPayment(): boolean {
    return ['momo', 'zalopay', 'ewallet'].indexOf(this.selectedPayment) >= 0;
  }
  termsAgreed = false;

  // Scan success (sau 3s khi chọn MoMo/Payoo/ZaloPay → alert "Chuyển khoản đã ghi nhận" → user bấm "Kiểm tra đơn hàng")
  showScanSuccessModal = false;
  scanSuccessOrderId = '';
  private scanSuccessTimer: ReturnType<typeof setTimeout> | null = null;

  // Modal state
  showModal = false;
  modalType: 'address' | 'receiver' | 'time' | 'note' | 'coupon' = 'address';
  modalTitle = '';
  modalData: any = {};
  modalId = Date.now();

  // Alert state
  showAlert = false;
  alertType: 'warning' | 'info' | 'confirm' = 'info';
  alertTitle = '';
  alertMessage = '';
  alertConfirm = false;
  alertIcon = '';
  private alertResolver?: (value: boolean) => void;

  // Computed properties
  get cartCount(): number {
    return this.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  }

  /** True khi đã điền đủ: địa chỉ, người nhận, SĐT, thời gian giao hàng (bắt buộc mới được bấm thanh toán) */
  get isShippingComplete(): boolean {
    const s = this.shippingInfo;
    const addr = (s.address || '').trim();
    const receiver = (s.receiver || '').trim();
    const phone = (s.phone || '').trim();
    const date = (s.deliveryDate || '').trim();
    const time = (s.deliveryTime || '').trim();
    return addr.length > 0 && receiver.length > 0 && phone.length > 0 && date.length > 0 && time.length > 0;
  }

  /** Disable nút "Kiểm tra đơn hàng" khi: giỏ trống, thiếu shipping, chưa tick điều khoản, hoặc chọn MoMo/ZaloPay/Payoo. */
  get isCheckoutDisabled(): boolean {
    return (
      !this.cartItems.length ||
      !this.isShippingComplete ||
      !this.termsAgreed ||
      this.isNonCashPayment
    );
  }

  get coupon(): CouponData {
    const subtotal = this.subtotal;
    const stored = this.getCouponData();
    if (!stored || !stored.code) {
      return { code: '', amount: 0, description: '', valid: false, message: 'Chưa áp dụng' };
    }
    const code = String(stored.code || '')
      .trim()
      .toUpperCase();
    const rule = this.couponRules[code];
    if (!rule) {
      this.clearCouponData();
      return { code: '', amount: 0, description: '', valid: false, message: 'Mã không hợp lệ' };
    }
    if (rule.minSubtotal && subtotal < rule.minSubtotal) {
      return {
        code,
        amount: 0,
        description: rule.description || '',
        valid: false,
        message: `Áp dụng cho đơn từ ${this.formatPrice(rule.minSubtotal)}d`,
      };
    }
    let amount = 0;
    if (rule.type === 'percent') {
      amount = Math.round(subtotal * (rule.value / 100));
      if (rule.max) amount = Math.min(amount, rule.max);
    } else if (rule.type === 'perItem') {
      const totalItems = this.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
      amount = totalItems * (Number(rule.value) || 0);
    } else {
      amount = Number(rule.value) || 0;
    }
    amount = Math.min(Math.max(amount, 0), subtotal);
    return {
      code,
      amount,
      description: rule.description || '',
      valid: amount > 0,
      message: rule.description || '',
    };
  }

  get totals(): Totals {
    const subtotal = this.subtotal;
    const coupon = this.coupon;
    const shipping = subtotal >= 150000 || !this.cartItems.length ? 0 : 10000;
    const discount = Math.min(Math.max(Number(coupon.amount) || 0, 0), subtotal);
    const grand = Math.max(0, subtotal + shipping - discount);
    return { subtotal, shipping, discount, grand };
  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.qty) || 1);
    }, 0);
  }

  get couponHint(): string {
    if (this.coupon.code) {
      return this.coupon.valid
        ? `Mã hiện tại: ${this.coupon.code}`
        : `${this.coupon.code} - ${this.coupon.message || 'Chưa đáp ứng điều kiện'}`;
    }
    return 'Ví dụ mã: NGOGIAFS, NGOVIP15';
  }

  ngOnInit(): void {
    this.loadItems();
    this.loadShippingInfo();
    this.updateShippingFields();
    this.setupStorageListener();
    this.startScanTimerIfNeeded();
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleStorageEvent);
    this.clearScanTimers();
  }

  /** Khi đổi phương thức thanh toán: clear timer rồi bật lại nếu đang chọn MoMo/ZaloPay/Payoo (nút bị disable nên timer tự chạy 3s). */
  onPaymentMethodChange(): void {
    this.clearScanTimers();
    this.startScanTimerIfNeeded();
  }

  private clearScanTimers(): void {
    if (this.scanSuccessTimer != null) {
      clearTimeout(this.scanSuccessTimer);
      this.scanSuccessTimer = null;
    }
  }

  /** Tạo orderId tránh trùng (6 số cuối timestamp + 2 số random). */
  private generateOrderId(): string {
    return 'HTNGTD' + Date.now().toString().slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0');
  }

  /** Chọn MoMo/ZaloPay/Payoo → sau 3s tự hiện modal "Chuyển khoản đã ghi nhận". Dùng NgZone + detectChanges để UI cập nhật ngay không cần bấm gì. */
  private startScanTimerIfNeeded(): void {
    if (!this.isNonCashPayment) return;
    this.clearScanTimers();
    const delayMs = 5000;
    this.scanSuccessTimer = setTimeout(() => {
      this.scanSuccessTimer = null;
      if (!this.termsAgreed || !this.cartItems.length || !this.isShippingComplete) return;
      const orderId = this.generateOrderId();
      this.ngZone.run(() => {
        this.scanSuccessOrderId = orderId;
        this.showScanSuccessModal = true;
        this.cdr.detectChanges();
      });
    }, delayMs);
  }

  private startScanTimerAfterCheckoutClick(orderId: string): void {
    this.clearScanTimers();
    this.scanSuccessOrderId = orderId;
    this.scanSuccessTimer = setTimeout(() => {
      this.scanSuccessTimer = null;
      this.ngZone.run(() => {
        this.showScanSuccessModal = true;
        this.cdr.detectChanges();
      });
    }, 5000);
  }

  /** Đóng modal "Chuyển khoản đã ghi nhận" và tạo đơn với status 'paid' rồi chuyển order-tracking. */
  closeScanSuccessAndCheckout(): void {
    const orderId = this.scanSuccessOrderId;
    this.showScanSuccessModal = false;
    this.scanSuccessOrderId = '';
    if (orderId) this.doCheckoutWithOrderId(orderId, 'paid');
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Storage methods
  private loadItems(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.cartItems = parsed;
        }
      }
    } catch (err) {
      console.warn('Cannot parse cart storage', err);
    }
  }

  private saveItems(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cartItems));
    this.updateShippingFields();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
  }

  private loadShippingInfo(): void {
    try {
      const raw = localStorage.getItem(this.SHIPPING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.shippingInfo = this.normalizeShipping(parsed);
      } else {
        // Không có dữ liệu (vd: sau logout) → form địa chỉ trống
        this.shippingInfo = {
          address: '',
          receiver: '',
          phone: '',
          deliveryDate: '',
          deliveryTime: '',
          time: '',
          note: '',
        };
      }
    } catch (err) {
      console.warn('Cannot parse shipping info', err);
      this.shippingInfo = {
        address: '',
        receiver: '',
        phone: '',
        deliveryDate: '',
        deliveryTime: '',
        time: '',
        note: '',
      };
    }
  }

  private saveShippingInfo(): void {
    localStorage.setItem(this.SHIPPING_KEY, JSON.stringify(this.shippingInfo));
    this.updateShippingFields();
  }

  private getCouponData(): { code: string } | null {
    try {
      const raw = localStorage.getItem(this.COUPON_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Cannot parse coupon storage', err);
      return null;
    }
  }

  private setCouponData(code: string): void {
    localStorage.setItem(this.COUPON_KEY, JSON.stringify({ code }));
  }

  private clearCouponData(): void {
    localStorage.removeItem(this.COUPON_KEY);
  }

  private getCurrentUser(): any {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.username) return parsed;
    } catch (err) {
      console.warn('Cannot parse user data', err);
    }
    return null;
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
  }

  private handleStorageEvent(evt: StorageEvent): void {
    if (evt.storageArea !== localStorage) return;
    if (evt.key === this.STORAGE_KEY || evt.key === this.COUPON_KEY) {
      this.loadItems();
      this.updateShippingFields();
    }
  }

  // Helper methods
  formatPrice(value: number): string {
    try {
      return Number(value || 0).toLocaleString('vi-VN');
    } catch {
      return String(value || 0);
    }
  }

  /** Một dòng gọn (tương thích cũ) */
  getItemDetails(item: CartItem): string {
    const parts: string[] = [];
    if (item.size) parts.push(`Size ${item.size}`);
    if (item.sweetness) parts.push(`Ngọt: ${item.sweetness}`);
    if (item.ice) parts.push(`Đá: ${item.ice}`);
    if (Array.isArray(item.options) && item.options.length) parts.push(item.options.join(', '));
    if (item.note) parts.push(item.note);
    return parts.join(' - ');
  }

  /** Nhiều dòng mô tả đúng như hình: "Size M - Ngọt: Ít, Đá: Ít" rồi "Topping: ..." */
  getItemDetailLines(item: CartItem): string[] {
    const lines: string[] = [];
    const ngot = item.sweetness || 'Ít';
    const da = item.ice || 'Ít';
    if (item.size) {
      const first = `Size ${item.size} - Ngọt: ${ngot} - Đá: ${da}`;
      lines.push(Array.isArray(item.toppings) && item.toppings.length ? first + ',' : first);
    } else if (item.sweetness || item.ice) {
      const part = [item.sweetness && `Ngọt: ${item.sweetness}`, item.ice && `Đá: ${item.ice}`]
        .filter(Boolean)
        .join(', ');
      lines.push(part);
    }
    if (Array.isArray(item.toppings) && item.toppings.length) {
      lines.push('Topping:');
      item.toppings.forEach((t) => lines.push(t));
    }
    if (lines.length === 0 && Array.isArray(item.options) && item.options.length) {
      lines.push(item.options.join(', '));
    }
    if (item.note && !lines.some((l) => l.includes(item.note!))) lines.push(item.note);
    return lines;
  }

  private buildTimeText(dateValue: string, timeValue: string): string {
    if (!dateValue && !timeValue) return '';
    const parts = String(dateValue || '').split('-');
    const [year, month = '', day = ''] = parts;
    const displayDate =
      parts.length === 3 ? `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}` : '';
    if (displayDate && timeValue) return `Nhận hàng ngày ${displayDate} - Vào lúc ${timeValue}`;
    if (displayDate) return `Nhận hàng ngày ${displayDate}`;
    if (timeValue) return `Nhận hàng vào lúc ${timeValue}`;
    return '';
  }

  private parseTimeText(value: string): { deliveryDate?: string; deliveryTime?: string } | null {
    if (!value) return null;
    const dateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const timeMatch = value.match(/(\d{1,2}:\d{2})/);
    const result: any = {};
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      result.deliveryDate = `${year}-${month}-${day}`;
    }
    if (timeMatch) {
      result.deliveryTime = timeMatch[1];
    }
    return Object.keys(result).length ? result : null;
  }

  private normalizeShipping(info: any): ShippingInfo {
    const data = { ...this.defaultShipping, ...(info || {}) };
    if ((!data.deliveryDate || !data.deliveryTime) && data.time) {
      const parsed = this.parseTimeText(data.time);
      if (parsed) {
        if (!data.deliveryDate && parsed.deliveryDate) data.deliveryDate = parsed.deliveryDate;
        if (!data.deliveryTime && parsed.deliveryTime) data.deliveryTime = parsed.deliveryTime;
      }
    }
    if (data.deliveryDate && data.deliveryTime) {
      data.time = this.buildTimeText(data.deliveryDate, data.deliveryTime);
    } else if (!data.time) {
      data.time = this.buildTimeText(
        this.defaultShipping.deliveryDate,
        this.defaultShipping.deliveryTime,
      );
    }
    data.note = (data.note || '').trim();
    return data;
  }

  private updateShippingFields(): void {
    this.shippingFields[0].value = this.shippingInfo.address || '';
    this.shippingFields[1].value = `${this.shippingInfo.receiver || ''}<br>${this.shippingInfo.phone || ''}`;
    this.shippingFields[2].value = this.shippingInfo.time || '';
    const noteTrim = (this.shippingInfo.note || '').trim();
    this.shippingFields[3].value = noteTrim || 'Không có ghi chú';
  }

  // Cart actions
  updateQuantity(index: number, qty: number): void {
    if (index >= 0 && index < this.cartItems.length) {
      this.cartItems[index].qty = Math.max(1, Math.min(99, Number(qty) || 1));
      this.saveItems();
    }
  }

  removeItem(index: number): void {
    if (index >= 0 && index < this.cartItems.length) {
      this.cartItems.splice(index, 1);
      this.saveItems();
    }
  }

  // Modal methods
  editShippingField(field: string): void {
    this.modalType = field as any;
    this.modalId = Date.now();

    switch (field) {
      case 'address':
        this.modalTitle = 'Thay đổi địa chỉ giao hàng';
        this.modalData = { address: this.shippingInfo.address };
        break;
      case 'receiver':
        this.modalTitle = 'Cập nhật người nhận';
        this.modalData = {
          receiver: this.shippingInfo.receiver,
          phone: this.shippingInfo.phone,
        };
        break;
      case 'time':
        this.modalTitle = 'Thời gian nhận hàng';
        this.modalData = {
          deliveryDate: this.shippingInfo.deliveryDate || this.minDate,
          deliveryTime: this.shippingInfo.deliveryTime || this.getCurrentTimeString(),
        };
        break;
      case 'note':
        this.modalTitle = 'Ghi chú cho cửa hàng';
        this.modalData = { note: this.shippingInfo.note || '' };
        break;
    }

    this.showModal = true;
  }

  openCouponModal(): void {
    this.modalType = 'coupon';
    this.modalTitle = 'Nhập mã giảm giá';
    this.modalId = Date.now();
    this.modalData = { code: this.coupon.code || '' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.modalData = {};
  }

  closeModalOnOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cart-modal')) {
      this.closeModal();
    }
  }

  submitModal(): void {
    switch (this.modalType) {
      case 'address':
        if (this.modalData.address?.trim()) {
          this.shippingInfo.address = this.modalData.address.trim();
          this.saveShippingInfo();
        }
        break;
      case 'receiver':
        if (this.modalData.receiver?.trim() && this.modalData.phone?.trim()) {
          this.shippingInfo.receiver = this.modalData.receiver.trim();
          this.shippingInfo.phone = this.modalData.phone.trim();
          this.saveShippingInfo();
        }
        break;
      case 'time':
        if (this.modalData.deliveryDate && this.modalData.deliveryTime) {
          this.shippingInfo.deliveryDate = this.modalData.deliveryDate;
          this.shippingInfo.deliveryTime = this.modalData.deliveryTime;
          this.shippingInfo.time = this.buildTimeText(
            this.modalData.deliveryDate,
            this.modalData.deliveryTime,
          );
          this.saveShippingInfo();
        }
        break;
      case 'note': {
        const noteTrim = (this.modalData.note || '').trim();
        this.shippingInfo.note = noteTrim;
        this.saveShippingInfo();
        break;
      }
      case 'coupon':
        this.applyCoupon(this.modalData.code);
        break;
    }
    this.closeModal();
  }

  clearCoupon(): void {
    this.clearCouponData();
    this.closeModal();
  }

  private applyCoupon(code: string): void {
    const normalized = String(code || '')
      .trim()
      .toUpperCase();
    const evaluation = this.evaluateCoupon(normalized);
    if (!evaluation.success) {
      if (evaluation.reason === 'minSubtotal') {
        this.setCouponData(normalized);
        this.showAlertModal(
          'warning',
          'Thông báo',
          evaluation.error || 'Mã chưa đáp ứng điều kiện',
          false,
        );
      } else {
        this.showAlertModal('warning', 'Lỗi', evaluation.error || 'Mã không hợp lệ', false);
      }
    } else {
      this.setCouponData(evaluation.code);
      this.showAlertModal('info', 'Thành công', `Đã áp dụng mã ${evaluation.code}!`, false);
    }
  }

  private evaluateCoupon(rawCode: string): any {
    const code = String(rawCode || '')
      .trim()
      .toUpperCase();
    if (!code) {
      return { success: false, reason: 'empty', error: 'Vui lòng nhập mã giảm giá.' };
    }
    const rule = this.couponRules[code];
    if (!rule) {
      return { success: false, reason: 'notFound', error: 'Mã giảm giá không tồn tại.' };
    }
    if (rule.minSubtotal && this.subtotal < rule.minSubtotal) {
      return {
        success: false,
        reason: 'minSubtotal',
        error: `Áp dụng cho đơn từ ${this.formatPrice(rule.minSubtotal)}d.`,
      };
    }
    let amount = 0;
    if (rule.type === 'percent') {
      amount = Math.round(this.subtotal * (rule.value / 100));
      if (rule.max) amount = Math.min(amount, rule.max);
    } else if (rule.type === 'perItem') {
      const totalItems = this.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
      amount = totalItems * (Number(rule.value) || 0);
    } else {
      amount = Number(rule.value) || 0;
    }
    amount = Math.min(Math.max(amount, 0), this.subtotal);
    if (!amount) {
      return {
        success: false,
        reason: 'noDiscount',
        error: 'Mã chưa áp dụng được cho đơn hiện tại.',
      };
    }
    return { success: true, code, amount, description: rule.description || '' };
  }

  // Alert methods
  private showAlertModal(
    type: 'warning' | 'info' | 'confirm',
    title: string,
    message: string,
    isConfirm: boolean,
  ): Promise<boolean> {
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertConfirm = isConfirm;

    const icons = {
      warning:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>',
      confirm:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>',
    };
    this.alertIcon = icons[type] || icons.info;

    this.showAlert = true;

    return new Promise((resolve) => {
      this.alertResolver = resolve;
    });
  }

  closeAlert(result: boolean): void {
    this.showAlert = false;
    if (this.alertResolver) {
      this.alertResolver(result);
      this.alertResolver = undefined;
    }
  }

  closeAlertOnOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('alert-overlay') && !this.alertConfirm) {
      this.closeAlert(false);
    }
  }

  // Checkout
  async checkout(): Promise<void> {

    if (!this.cartItems.length) {
      await this.showAlertModal('info', 'Giỏ hàng trống', 'Giỏ hàng hiện đang trống.', false);
      return;
    }

    if (!this.isShippingComplete) {
      await this.showAlertModal(
        'warning',
        'Thiếu thông tin giao hàng',
        'Vui lòng điền đủ các mục bắt buộc (địa chỉ, người nhận, Số điện thoại, thời gian giao hàng) trước khi thanh toán.',
        false,
      );
      return;
    }
    if (!this.termsAgreed) {
      await this.showAlertModal(
        'warning',
        'Chưa đồng ý điều khoản',
        'Vui lòng đồng ý với các điều khoản trước khi thanh toán.',
        false,
      );
      return;
    }
    if (this.isNonCashPayment) {
      const orderId = this.generateOrderId();
      this.startScanTimerAfterCheckoutClick(orderId);
      return;
    }
    const orderId = this.generateOrderId();
    this.doCheckoutWithOrderId(orderId, 'pending');
  }

  /** Tạo đơn với orderId có sẵn và chuyển sang order-tracking (dùng cho cả checkout thường và sau khi “scan” 3s). */
  doCheckoutWithOrderId(orderId: string, status: 'pending' | 'paid' = 'pending'): void {
    const user = this.getCurrentUser();
    const pm = this.paymentMethods.find((m) => m.value === this.selectedPayment);
    const paymentLabel = pm ? pm.label : 'Tiền mặt';

    const order = {
      id: orderId,
      orderId: orderId,
      date: new Date().toISOString(),
      customerName: this.shippingInfo.receiver || (user ? user.username : 'Khách hàng'),
      customerPhone: this.shippingInfo.phone || '0123456789',
      customerAddress: this.shippingInfo.address || '',
      paymentMethod: paymentLabel,
      status,
      subtotal: this.totals.subtotal,
      shipping: this.totals.shipping,
      discount: this.totals.discount,
      total: this.totals.grand,
      items: this.cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        size: item.size || '',
        image: item.image || '',
        options: item.options || [],
        sweetness: item.sweetness || '',
        ice: item.ice || '',
        toppings: item.toppings || [],
        note: item.note || '',
      })),
      deliveryDate: this.shippingInfo.deliveryDate || '',
      deliveryTime: this.shippingInfo.deliveryTime || '',
      note: (this.shippingInfo.note || '').trim() || 'Không có ghi chú',
      couponCode: this.coupon.code || '',
    };

    try {
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push(order);
      localStorage.setItem('orders', JSON.stringify(existingOrders));
    } catch (err) {
      console.error('Error saving order:', err);
    }

    // Xoá giỏ hàng đã thanh toán và cập nhật badge header
    this.cartItems = [];
    localStorage.setItem(this.STORAGE_KEY, '[]');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }

    this.router.navigate(['/order-tracking'], { queryParams: { orderId } });
  }
}
