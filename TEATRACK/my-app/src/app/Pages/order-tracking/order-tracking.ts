import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../order.service';
import { MapTracking } from './map-tracking/map-tracking';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MapTracking],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.css'],
})
export class OrderTracking implements OnInit, OnDestroy {
  // Dữ liệu đơn hàng
  order: any = null;
  orderId: string | null = null;

  // UI states
  showReviewModal = false;
  showReviewSuccessModal = false;
  review = {
    rating: 0,
    title: '',
    comment: '',
    reviewerName: '',
  };
  ratingText = 'Chưa chọn';

  statusFlow = ['pending', 'processing', 'ready', 'shipping', 'completed'];
  private readonly progressByStep = [7, 30, 50, 72, 100];

  get timelineProgressPercent(): number {
    if (!this.order?.status) return 0;
    const stepIndex = this.statusFlow.indexOf(this.order.status);
    return stepIndex < 0 ? 0 : (this.progressByStep[stepIndex] ?? this.progressByStep[this.progressByStep.length - 1]);
  }

  statusNames: Record<string, string> = {
    pending: 'Xác nhận đơn hàng',
    processing: 'Chuẩn bị đơn hàng',
    ready: 'Chờ lấy hàng',
    shipping: 'Đang giao hàng',
    completed: 'Giao thành công',
  };


  // Auto refresh interval
  private refreshInterval: any;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private orderService: OrderService,
  ) { }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (this.orderId) {
      this.loadOrderData();
      this.startAutoRefresh();
      this.applyFragmentAndOpenReview();
    } else {
      this.showError('Không tìm thấy thông tin đơn hàng');
    }

    // Xoá giỏ hàng sau khi đặt hàng thành công
    localStorage.removeItem('cart_items');
  }

  /** Cuộn tới fragment (order-status, order-items-section) và/hoặc mở modal đánh giá khi có openReview=1 (từ order-history). */
  private applyFragmentAndOpenReview(): void {
    setTimeout(() => {
      const fragment = this.route.snapshot.fragment;
      const openReview = this.route.snapshot.queryParamMap.get('openReview');
      if (fragment === 'order-status') {
        const el = document.getElementById('order-status');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (fragment === 'order-items-section') {
        const el = document.getElementById('order-items-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (openReview === '1') {
        const reviewEl = document.getElementById('review-section');
        if (reviewEl) reviewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.openReviewModal();
        this.cdr.detectChanges();
      }
    }, 350);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== LOAD ORDER ====================
  private loadOrderData(): void {
    const token = localStorage.getItem('token');
    if (token && this.orderId) {
      this.orderService.getOrderById(this.orderId).subscribe({
        next: (res) => {
          if (res.order) {
            this.order = res.order;
            this.updateTimeline(this.order.status || 'pending', false);
            // Cập nhật lại localStorage để đồng bộ status
            try {
              const orders = JSON.parse(localStorage.getItem('orders') || '[]');
              const idx = orders.findIndex((o: any) => (o.id || o.orderId) === this.orderId);
              if (idx !== -1) {
                orders[idx].status = res.order.status;
                localStorage.setItem('orders', JSON.stringify(orders));
              }
            } catch (e) { }
            this.cdr.detectChanges();
            if (this.route.snapshot.fragment === 'order-items-section') {
              setTimeout(() => {
                const el = document.getElementById('order-items-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 150);
            }
          } else {
            this.loadFromFallback();
          }
        },
        error: (err) => {
          console.error('Failed to fetch order from API', err);
          this.loadFromFallback();
        }
      });
    } else {
      this.loadFromFallback();
    }
  }

  private loadFromFallback(): void {
    const order = this.getOrderFromStorage();
    if (order) {
      this.order = order;
      this.updateTimeline(order.status || 'pending', false);
    } else {
      this.fetchOrderFromJson();
    }
  }

  private getOrderFromStorage(): any {
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      return orders.find((o: any) => (o.id || o.orderId) === this.orderId);
    } catch (err) {
      console.error('Lỗi đọc orders từ localStorage', err);
      return null;
    }
  }

  private async fetchOrderFromJson(): Promise<void> {
    try {
      const response = await fetch('/public/data/orders.json');
      if (!response.ok) throw new Error('Không thể tải orders.json');
      const orders = await response.json();
      const order = orders.find((o: any) => (o.id || o.orderId) === this.orderId);
      if (order) {
        this.order = order;
        this.updateTimeline(order.status || 'pending', false);
        this.applyFragmentAndOpenReview();
      } else {
        this.showError('Không tìm thấy đơn hàng');
      }
    } catch (error) {
      console.error('Lỗi fetch order:', error);
      this.showError('Không thể tải thông tin đơn hàng');
    }
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && this.orderId) {
        this.orderService.getOrderById(this.orderId).subscribe({
          next: (res) => {
            if (res.order && res.order.status !== this.order?.status) {
              this.order = res.order;
              this.updateTimeline(res.order.status, true);

              // Cập nhật lại localStorage để các trang khác (OrderHistory) cũng thấy status mới
              try {
                const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                const idx = orders.findIndex((o: any) => (o.id || o.orderId) === this.orderId);
                if (idx !== -1) {
                  orders[idx].status = res.order.status;
                  localStorage.setItem('orders', JSON.stringify(orders));
                }
              } catch (e) { }

              this.cdr.detectChanges();
            }
          }
        });
      } else {
        const updated = this.getOrderFromStorage();
        if (updated && updated.status !== this.order?.status) {
          this.order = updated;
          this.updateTimeline(updated.status, false);
          this.cdr.detectChanges();
        }
      }
    }, 15000); // 15 giây
  }

  // ==================== UI HELPERS ====================
  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return this.formatDateFromDate(d);
  }

  /** Format Date object thành dd/mm/yyyy hh:mm */
  formatDateFromDate(d: Date): string {
    if (!d || isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private addMinutes(date: Date, minutes: number): Date {
    const d = new Date(date.getTime());
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  /**
   * Tính mốc thời gian cho từng bước timeline từ thời gian đặt hàng:
   * Pending = orderDate + 5 phút
   * Processing = pending + 2 phút
   * Ready = processing + (số sản phẩm × 3 phút)
   * Shipping = ready + 5 phút
   * Completed = shipping + 30 phút
   */
  getStatusTimestamp(step: string): Date | null {
    if (!this.order) return null;
    const raw = this.order.date || this.order.createdAt;
    if (!raw) return null;
    const orderDate = new Date(raw);
    if (isNaN(orderDate.getTime())) return null;
    const itemCount = Array.isArray(this.order.items) ? this.order.items.length : 0;
    const pending = this.addMinutes(orderDate, 5);
    const processing = this.addMinutes(pending, 2);
    const readyMinutes = itemCount * 3;
    const ready = this.addMinutes(processing, readyMinutes);
    const shipping = this.addMinutes(ready, 5);
    const completed = this.addMinutes(shipping, 30);
    const map: Record<string, Date> = {
      pending,
      processing,
      ready,
      shipping,
      completed,
    };
    return map[step] ?? null;
  }

  /** True nếu đã tới bước này (active hoặc completed); dùng để ẩn ô chữ/icon khi chưa tới. */
  isStepReached(step: string): boolean {
    const status = this.order?.status || 'pending';
    const statusIndex = this.statusFlow.indexOf(status);
    const stepIndex = this.statusFlow.indexOf(step);
    return stepIndex >= 0 && statusIndex >= stepIndex;
  }

  /** Hiển thị thời gian bước: chỉ khi đã tới bước mới hiện thời gian, chưa tới thì trả về rỗng. */
  getStatusTimeDisplay(step: string): string {
    if (!this.isStepReached(step)) return '';
    const ts = this.getStatusTimestamp(step);
    return ts ? this.formatDateFromDate(ts) : '';
  }

  /** Nhiều dòng mô tả sản phẩm (giống cart: Size, Ngọt, Đá, Topping; Số lượng xuống dòng riêng). */
  getItemDetailLines(item: any): string[] {
    const lines: string[] = [];
    const ngot = item.sweetness || 'Ít';
    const da = item.ice || 'Ít';
    const qty = item.qty ?? item.quantity ?? 1;
    if (item.size) {
      const first = `Size ${item.size} - Ngọt: ${ngot} - Đá: ${da}`;
      lines.push(Array.isArray(item.toppings) && item.toppings.length ? first + ',' : first);
    } else if (item.sweetness || item.ice) {
      const part = [item.sweetness && `Ngọt: ${item.sweetness}`, item.ice && `Đá: ${item.ice}`]
        .filter(Boolean)
        .join(', ');
      lines.push(part);
    }
    lines.push(`Số lượng: ${qty}`);
    if (Array.isArray(item.toppings) && item.toppings.length) {
      lines.push('Topping:');
      item.toppings.forEach((t: string) => lines.push(t));
    }
    if (lines.length === 0 && Array.isArray(item.options) && item.options.length) {
      lines.push(item.options.join(', '));
    }
    if (item.note && !lines.some((l: string) => l.includes(item.note))) {
      lines.push(item.note);
    }
    return lines;
  }

  // ==================== TIMELINE ====================
  getStatusClass(step: string): { active: boolean; completed: boolean } {
    if (!this.order) return { active: false, completed: false };
    const currentIndex = this.statusFlow.indexOf(this.order.status || 'pending');
    const stepIndex = this.statusFlow.indexOf(step);
    return {
      active: stepIndex === currentIndex,
      completed: stepIndex < currentIndex,
    };
  }

  updateTimeline(status: string, animate: boolean): void {
    this.order = { ...this.order, status };
    if (animate) {
      const steps = this.statusFlow;
      const newIndex = steps.indexOf(status);
      for (let i = 0; i <= newIndex; i++) {
        const step = steps[i];
        setTimeout(() => {
          const el = document.getElementById(`timeline-${step}`);
          const numberIcon = el?.querySelector('.timeline-number');
          if (numberIcon) {
            numberIcon.classList.add('animate-bounce');
            setTimeout(() => numberIcon.classList.remove('animate-bounce'), 600);
          }
        }, i * 200); // delay 200ms mỗi bước
      }
    }
  }


  // ==================== REVIEW MODAL ====================
  openReviewModal(): void {
    this.showReviewModal = true;
    this.review = { rating: 0, title: '', comment: '', reviewerName: '' };
    this.ratingText = 'Chưa chọn';
    document.body.style.overflow = 'hidden';
  }

  setReviewRating(star: number): void {
    this.review.rating = Math.min(5, Math.max(1, star));
    const texts: Record<number, string> = {
      5: 'Tuyệt vời!',
      4: 'Rất tốt!',
      3: 'Tốt!',
      2: 'Trung bình',
      1: 'Kém',
    };
    this.ratingText = texts[this.review.rating] || 'Chưa chọn';
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    document.body.style.overflow = '';
  }

  submitReview(): void {
    if (this.review.rating === 0 || !this.review.comment.trim()) {
      return;
    }

    const reviewData = {
      orderId: this.orderId,
      rating: this.review.rating,
      title: (this.review.title || '').trim() || undefined,
      comment: this.review.comment.trim(),
      reviewerName: this.review.reviewerName.trim() || 'Khách hàng',
      date: new Date().toISOString(),
      productIds: this.order?.items?.map((i: any) => i.id) || [],
    };

    try {
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
      reviews.push(reviewData);
      localStorage.setItem('reviews', JSON.stringify(reviews));
      this.closeReviewModal();
      this.showReviewSuccessModal = true;
    } catch (err) {
      console.error('Lỗi lưu review', err);
    }
  }

  closeReviewSuccessModal(): void {
    this.showReviewSuccessModal = false;
  }

  // ==================== ERROR HANDLING ====================
  private showError(message: string): void {
    // Ẩn các phần nội dung và hiển thị lỗi trên hero
    this.order = null;
    const heroTitle = document.querySelector('.hero-title') as HTMLElement;
    const heroSubtitle = document.querySelector('.hero-subtitle') as HTMLElement;
    if (heroTitle) heroTitle.textContent = 'Có lỗi xảy ra';
    if (heroSubtitle) heroSubtitle.textContent = message;
  }
}
