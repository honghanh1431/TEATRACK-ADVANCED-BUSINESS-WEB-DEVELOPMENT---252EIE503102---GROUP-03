import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.css']
})
export class OrderTracking implements OnInit, OnDestroy {
  // Dữ liệu đơn hàng
  order: any = null;
  orderId: string | null = null;

  // UI states
  showReviewModal = false;
  review = {
    rating: 0,
    comment: '',
    reviewerName: ''
  };
  ratingText = 'Chưa chọn';

  // Timeline status
  statusFlow = ['pending', 'processing', 'ready', 'shipping', 'completed'];
  statusNames: Record<string, string> = {
    pending: 'Xác nhận đơn hàng',
    processing: 'Chuẩn bị đơn hàng',
    ready: 'Chờ lấy hàng',
    shipping: 'Đang giao hàng',
    completed: 'Giao thành công'
  };

  // Demo control
  demoMode = true; // có thể đặt false ở môi trường production
  btnNextDisabled = false;
  btnNextTitle = '';

  // Auto refresh interval
  private refreshInterval: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (this.orderId) {
      this.loadOrderData();
      this.startAutoRefresh();
    } else {
      this.showError('Không tìm thấy thông tin đơn hàng');
    }

    // Xoá giỏ hàng sau khi đặt hàng thành công
    localStorage.removeItem('cart_items');
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
    const order = this.getOrderFromStorage();
    if (order) {
      this.order = order;
      this.updateTimeline(order.status || 'pending', false);
      this.updateDemoButtonState();
    } else {
      // Thử fetch từ file JSON (nếu cần)
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
        this.updateDemoButtonState();
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
      const updated = this.getOrderFromStorage();
      if (updated && updated.status !== this.order?.status) {
        this.order = updated;
        this.updateTimeline(updated.status, false);
      }
    }, 30000); // 30 giây
  }

  // ==================== UI HELPERS ====================
  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  // ==================== TIMELINE ====================
  getStatusClass(step: string): { active: boolean; completed: boolean } {
    if (!this.order) return { active: false, completed: false };
    const currentIndex = this.statusFlow.indexOf(this.order.status || 'pending');
    const stepIndex = this.statusFlow.indexOf(step);
    return {
      active: stepIndex === currentIndex,
      completed: stepIndex < currentIndex
    };
  }

  // Cập nhật timeline với animation (nếu animate = true)
  updateTimeline(status: string, animate: boolean): void {
    this.order = { ...this.order, status };
    // Animation được xử lý bằng CSS class + setTimeout delay
    if (animate) {
      const steps = this.statusFlow;
      const newIndex = steps.indexOf(status);
      for (let i = 0; i <= newIndex; i++) {
        const step = steps[i];
        setTimeout(() => {
          // Kích hoạt animation cho icon số (thêm class)
          const el = document.getElementById(`timeline-${step}`);
          const numberIcon = el?.querySelector('.timeline-number');
          if (numberIcon) {
            numberIcon.classList.add('animate-bounce');
            setTimeout(() => numberIcon.classList.remove('animate-bounce'), 600);
          }
        }, i * 200); // delay 200ms mỗi bước
      }
    }
    this.updateDemoButtonState();
  }

  // ==================== DEMO BUTTON ====================
  private updateDemoButtonState(): void {
    if (!this.order) return;
    const currentIndex = this.statusFlow.indexOf(this.order.status);
    this.btnNextDisabled = currentIndex >= this.statusFlow.length - 1;
    if (this.btnNextDisabled) {
      this.btnNextTitle = 'Đơn hàng đã hoàn thành';
    } else {
      const nextStatus = this.statusFlow[currentIndex + 1];
      this.btnNextTitle = `Chuyển sang: ${this.statusNames[nextStatus]}`;
    }
  }

  nextStatus(): void {
    if (!this.order || this.btnNextDisabled) return;
    const currentIndex = this.statusFlow.indexOf(this.order.status);
    const nextStatus = this.statusFlow[currentIndex + 1];

    // Cập nhật trong localStorage
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      const idx = orders.findIndex((o: any) => (o.id || o.orderId) === this.orderId);
      if (idx !== -1) {
        orders[idx].status = nextStatus;
        localStorage.setItem('orders', JSON.stringify(orders));
      }
    } catch (err) {
      console.error('Không thể cập nhật status', err);
    }

    this.updateTimeline(nextStatus, true);

    // Hiển thị thông báo nhỏ
    this.showToast(`✅ ${this.statusNames[nextStatus]}`);
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'status-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: #10b981; color: white; padding: 12px 24px;
      border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // ==================== REVIEW MODAL ====================
  openReviewModal(): void {
    this.showReviewModal = true;
    this.review = { rating: 0, comment: '', reviewerName: '' };
    this.ratingText = 'Chưa chọn';
    document.body.style.overflow = 'hidden';
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    document.body.style.overflow = '';
  }

  onRatingChange(value: number): void {
    this.review.rating = value;
    const texts: Record<number, string> = {
      5: 'Tuyệt vời! ⭐⭐⭐⭐⭐',
      4: 'Rất tốt! ⭐⭐⭐⭐',
      3: 'Tốt! ⭐⭐⭐',
      2: 'Trung bình ⭐⭐',
      1: 'Kém ⭐'
    };
    this.ratingText = texts[value] || 'Chưa chọn';
  }

  submitReview(): void {
    if (this.review.rating === 0 || !this.review.comment.trim()) {
      alert('Vui lòng chọn số sao và nhập nhận xét.');
      return;
    }

    const reviewData = {
      orderId: this.orderId,
      rating: this.review.rating,
      comment: this.review.comment,
      reviewerName: this.review.reviewerName.trim() || 'Khách hàng',
      date: new Date().toISOString(),
      productIds: this.order?.items?.map((i: any) => i.id) || []
    };

    try {
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
      reviews.push(reviewData);
      localStorage.setItem('reviews', JSON.stringify(reviews));
      alert('Cảm ơn bạn đã đánh giá!');
      this.closeReviewModal();
    } catch (err) {
      console.error('Lỗi lưu review', err);
    }
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