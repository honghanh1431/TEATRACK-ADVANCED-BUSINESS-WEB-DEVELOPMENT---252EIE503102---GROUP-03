import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size?: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class Cart implements OnInit, OnDestroy {
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

  // Time options
  readonly timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30',
  ];

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
};

  // State variables
  cartItems: CartItem[] = [];
  shippingInfo: ShippingInfo = { ...this.defaultShipping };
  selectedPayment = 'cash';
  termsAgreed = false;

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

  get coupon(): CouponData {
    const subtotal = this.subtotal;
    const stored = this.getCouponData();
    if (!stored || !stored.code) {
      return { code: '', amount: 0, description: '', valid: false, message: 'Chưa áp dụng' };
    }
    const code = String(stored.code || '').trim().toUpperCase();
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
    return { code, amount, description: rule.description || '', valid: amount > 0, message: rule.description || '' };
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
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleStorageEvent);
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
  }

  private loadShippingInfo(): void {
    try {
      const raw = localStorage.getItem(this.SHIPPING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.shippingInfo = this.normalizeShipping(parsed);
      } else {
        this.shippingInfo = { ...this.defaultShipping };
        this.shippingInfo.time = this.buildTimeText(this.shippingInfo.deliveryDate, this.shippingInfo.deliveryTime);
      }
    } catch (err) {
      console.warn('Cannot parse shipping info', err);
      this.shippingInfo = { ...this.defaultShipping };
      this.shippingInfo.time = this.buildTimeText(this.shippingInfo.deliveryDate, this.shippingInfo.deliveryTime);
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

  getItemDetails(item: CartItem): string {
    const details = [
      item.size ? `Size ${item.size}` : '',
      Array.isArray(item.options) && item.options.length ? item.options.join(', ') : '',
      item.note || '',
    ];
    return details.filter(Boolean).join(' - ');
  }

  private buildTimeText(dateValue: string, timeValue: string): string {
    if (!dateValue && !timeValue) return '';
    const parts = String(dateValue || '').split('-');
    const [year, month = '', day = ''] = parts;
    const displayDate = parts.length === 3 ? `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}` : '';
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
      data.time = this.buildTimeText(this.defaultShipping.deliveryDate, this.defaultShipping.deliveryTime);
    }
    data.note = (data.note || '').trim();
    return data;
  }

  private updateShippingFields(): void {
    this.shippingFields[0].value = this.shippingInfo.address || '';
    this.shippingFields[1].value = `${this.shippingInfo.receiver || ''}<br>${this.shippingInfo.phone || ''}`;
    this.shippingFields[2].value = this.shippingInfo.time || '';
    this.shippingFields[3].value = this.shippingInfo.note || 'Không có ghi chú';
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
          phone: this.shippingInfo.phone
        };
        break;
      case 'time':
        this.modalTitle = 'Thời gian nhận hàng';
        this.modalData = {
          deliveryDate: this.shippingInfo.deliveryDate || this.minDate,
          deliveryTime: this.shippingInfo.deliveryTime || this.timeOptions[0]
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
          this.shippingInfo.time = this.buildTimeText(this.modalData.deliveryDate, this.modalData.deliveryTime);
          this.saveShippingInfo();
        }
        break;
      case 'note':
        this.shippingInfo.note = this.modalData.note || '';
        this.saveShippingInfo();
        break;
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
    const normalized = String(code || '').trim().toUpperCase();
    const evaluation = this.evaluateCoupon(normalized);
    if (!evaluation.success) {
      if (evaluation.reason === 'minSubtotal') {
        this.setCouponData(normalized);
        this.showAlertModal('warning', 'Thông báo', evaluation.error || 'Mã chưa đáp ứng điều kiện', false);
      } else {
        this.showAlertModal('warning', 'Lỗi', evaluation.error || 'Mã không hợp lệ', false);
      }
    } else {
      this.setCouponData(evaluation.code);
      this.showAlertModal('info', 'Thành công', `Đã áp dụng mã ${evaluation.code}!`, false);
    }
  }

  private evaluateCoupon(rawCode: string): any {
    const code = String(rawCode || '').trim().toUpperCase();
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
      return { success: false, reason: 'noDiscount', error: 'Mã chưa áp dụng được cho đơn hiện tại.' };
    }
    return { success: true, code, amount, description: rule.description || '' };
  }

  // Alert methods
  private showAlertModal(type: 'warning' | 'info' | 'confirm', title: string, message: string, isConfirm: boolean): Promise<boolean> {
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertConfirm = isConfirm;

    const icons = {
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
      confirm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>'
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
    if (!this.termsAgreed) {
      await this.showAlertModal(
        'warning',
        'Chưa đồng ý điều khoản',
        'Vui lòng đồng ý với các điều khoản trước khi thanh toán.',
        false
      );
      return;
    }

    if (!this.cartItems.length) {
      await this.showAlertModal(
        'info',
        'Giỏ hàng trống',
        'Giỏ hàng hiện đang trống.',
        false
      );
      return;
    }

    // Cash payment - create order
    if (this.selectedPayment === 'cash') {
      const user = this.getCurrentUser();
      const orderId = 'HTNGTD' + Date.now().toString().slice(-6);

      const order = {
        id: orderId,
        orderId: orderId,
        date: new Date().toISOString(),
        customerName: this.shippingInfo.receiver || (user ? user.username : 'Khách hàng'),
        customerPhone: this.shippingInfo.phone || '0123456789',
        customerAddress: this.shippingInfo.address || '',
        paymentMethod: 'Tiền mặt',
        status: 'pending',
        subtotal: this.totals.subtotal,
        shipping: this.totals.shipping,
        discount: this.totals.discount,
        total: this.totals.grand,
        items: this.cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
          size: item.size || '',
          image: item.image || '',
          options: item.options || [],
        })),
        deliveryDate: this.shippingInfo.deliveryDate || '',
        deliveryTime: this.shippingInfo.deliveryTime || '',
        note: this.shippingInfo.note || '',
        couponCode: this.coupon.code || '',
      };

      try {
        const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        existingOrders.push(order);
        localStorage.setItem('orders', JSON.stringify(existingOrders));
      } catch (err) {
        console.error('Error saving order:', err);
      }

      window.location.href = '/order-tracking/?orderId=' + orderId;
      return;
    }

    // Other payment methods
    const methodMap: Record<string, string> = { momo: 'momo', zalopay: 'zalopay', ewallet: 'payoo' };
    const method = methodMap[this.selectedPayment] || 'momo';
    window.location.href = '/payment/?method=' + method;
  }
}