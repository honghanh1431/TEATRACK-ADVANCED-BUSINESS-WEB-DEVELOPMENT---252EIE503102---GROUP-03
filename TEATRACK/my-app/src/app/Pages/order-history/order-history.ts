import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { OrderService } from '../../order.service';

export interface Product {
  id?: string;
  name: string;
  meta: string;
  price: string;
  emoji: string;
  colorClass: string;
  image?: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'ready' | 'shipping' | 'completed';
  statusLabel: string;
  products: Product[];
  total: string;
  activeStep: number;
  progressPercent: number;
  deliveryAgency?: string;
}

export interface Tab {
  status: string;
  icon: string;
  label: string;
  count: number;
}

export interface TimelineStep {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-history.html',
  styleUrl: './order-history.css',
})
export class OrderHistory implements OnInit, OnDestroy {
  /** Modal xác nhận huỷ đơn */
  showCancelModal = false;
  orderToCancel: Order | null = null;
  private socket: Socket | undefined;

  constructor(
    private router: Router,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('orderUpdated', (data: any) => {
      this.fetchOrders();
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Mỗi trang hiển thị 3 đơn */
  readonly PAGE_SIZE = 3;
  /** Pagination chỉ hiển thị tối đa 5 số, sau đó là dấu ... */
  readonly PAGINATION_VISIBLE = 5;
  activeTab = 'all';
  currentPage = 1;
  totalPages = 1;

  timelineSteps: TimelineStep[] = [
    { icon: '🕐', label: 'Xác nhận đơn hàng' },
    { icon: '📦', label: 'Chuẩn bị đơn hàng' },
    { icon: '🏪', label: 'Chờ lấy hàng' },
    { icon: '🚚', label: 'Đang giao hàng' },
    { icon: '⭐', label: 'Giao thành công' },
  ];

  tabs: Tab[] = [
    { status: 'all', icon: '🛒', label: 'Tất cả', count: 5 },
    { status: 'pending', icon: '🕐', label: 'Xác nhận đơn hàng', count: 1 },
    { status: 'processing', icon: '📦', label: 'Chuẩn bị đơn hàng', count: 1 },
    { status: 'ready', icon: '🏪', label: 'Chờ lấy hàng', count: 1 },
    { status: 'shipping', icon: '🚚', label: 'Đang giao hàng', count: 1 },
    { status: 'completed', icon: '⭐', label: 'Giao thành công', count: 1 },
  ];

  orders: Order[] = [
    {
      id: '#DH-20240301',
      date: '01/03/2024',
      status: 'pending',
      statusLabel: 'Xác nhận đơn hàng',
      activeStep: 0,
      progressPercent: 0,
      total: '2.330.000₫',
      products: [
        {
          name: 'Giày Thể Thao Nike Air Max 270',
          meta: 'Size: 42 · Màu: Trắng · x1',
          price: '1.850.000₫',
          emoji: '👟',
          colorClass: 'c1',
          image: '/assets/images/products/tra-o-long-moc-huong.png',
        },
        {
          name: 'Áo Thun Polo Cotton Premium',
          meta: 'Size: L · Màu: Xanh Navy · x2',
          price: '480.000₫',
          emoji: '👕',
          colorClass: 'c2',
          image: '/assets/images/products/hong-tra-bi-dao.jpg',
        },
      ],
    },
    {
      id: '#DH-20240289',
      date: '28/02/2024',
      status: 'processing',
      statusLabel: 'Chuẩn bị đơn hàng',
      activeStep: 1,
      progressPercent: 30,
      total: '2.290.000₫',
      products: [
        {
          id: '1',
          name: 'Bàn Phím Cơ Keychron K2 V2',
          meta: 'Switch: Brown · Layout: TKL · x1',
          price: '2.290.000₫',
          emoji: '💻',
          colorClass: 'c3',
          image: '/assets/images/products/tra-xanh-bi-dao.jpg',
        },
      ],
    },
    {
      id: '#DH-20240275',
      date: '25/02/2024',
      status: 'ready',
      statusLabel: 'Chờ lấy hàng',
      activeStep: 2,
      progressPercent: 50,
      total: '1.010.000₫',
      products: [
        {
          name: 'Balo Laptop Thời Trang Unisex 15"',
          meta: 'Màu: Đen · x1',
          price: '650.000₫',
          emoji: '🎒',
          colorClass: 'c4',
          image: '/assets/images/products/tra-xanh-hoa-nhai.jpg',
        },
        {
          name: 'Kem Chống Nắng SPF50 Anessa',
          meta: '60ml · x3',
          price: '360.000₫',
          emoji: '🧴',
          colorClass: 'c2',
          image: '/assets/images/products/hong-tra-bi-dao.jpg',
        },
      ],
    },
    {
      id: '#DH-20240260',
      date: '20/02/2024',
      status: 'shipping',
      statusLabel: 'Đang giao hàng',
      activeStep: 3,
      progressPercent: 75,
      total: '290.000₫',
      products: [
        {
          name: 'Ốp Lưng iPhone 15 Pro Magsafe',
          meta: 'Màu: Trong suốt · x2',
          price: '290.000₫',
          emoji: '📱',
          colorClass: 'c1',
          image: '/assets/images/products/tra-o-long-moc-huong.png',
        },
      ],
    },
    {
      id: '#DH-20240241',
      date: '10/02/2024',
      status: 'completed',
      statusLabel: 'Giao thành công',
      activeStep: 4,
      progressPercent: 100,
      total: '4.500.000₫',
      products: [
        {
          name: 'Ghế Gaming Ergonomic E-Dra EGC203',
          meta: 'Màu: Đen đỏ · x1',
          price: '4.500.000₫',
          emoji: '🪑',
          colorClass: 'c3',
          image: '/assets/images/products/tra-xanh-bi-dao.jpg',
        },
      ],
    },
  ];

  filteredOrders: Order[] = [];

  private readonly STATUS_LABELS: Record<string, string> = {
    pending: 'Xác nhận đơn hàng',
    processing: 'Chuẩn bị đơn hàng',
    ready: 'Chờ lấy hàng',
    shipping: 'Đang giao hàng',
    completed: 'Giao thành công',
    paid: 'Chuẩn bị đơn hàng',
  };
  private readonly STATUS_FLOW = ['pending', 'processing', 'ready', 'shipping', 'completed'];

  get pagedOrders(): Order[] {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.filteredOrders.slice(start, start + this.PAGE_SIZE);
  }

  ngOnInit(): void {
    this.fetchOrders();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  fetchOrders(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.orderService.getMyOrders().subscribe({
        next: (res) => {
          if (res.orders && res.orders.length > 0) {
            this.orders = res.orders.map((o: any) => this.mapStorageOrderToOrder(o)).filter(Boolean) as Order[];
          } else {
            this.loadOrdersFromStorage();
          }
          this.filteredOrders = [...this.orders];
          this.updateTabCounts();
          this.updatePagination();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load orders from server', err);
          this.loadOrdersFromStorage();
          this.filteredOrders = [...this.orders];
          this.updateTabCounts();
          this.updatePagination();
          this.cdr.detectChanges();
        }
      });
    } else {
      this.loadOrdersFromStorage();
      this.filteredOrders = [...this.orders];
      this.updateTabCounts();
      this.updatePagination();
    }
  }

  /** Load đơn từ localStorage (cart / order-tracking đã lưu) và map sang Order hiển thị. */
  private loadOrdersFromStorage(): void {
    try {
      const raw = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
      if (raw.length === 0) return;
      this.orders = raw.map((o) => this.mapStorageOrderToOrder(o)).filter(Boolean) as Order[];
      if (this.orders.length > 0) {
        this.filteredOrders = [...this.orders];
        this.updateTabCounts();
        this.updatePagination();
      }
    } catch (e) {
      console.error('loadOrdersFromStorage', e);
    }
  }

  private mapStorageOrderToOrder(storage: any): Order | null {
    const id = storage.id || storage.orderId || '';
    if (!id) return null;
    let status = (storage.status || 'pending') as string;
    if (status === 'paid') status = 'processing';
    if (!this.STATUS_FLOW.includes(status)) status = 'pending';
    const statusLabel = this.STATUS_LABELS[status] || this.STATUS_LABELS['pending'];
    const stepIndex = this.STATUS_FLOW.indexOf(status);
    const progressByStep = [10, 30, 50, 70, 100];
    const progressPercent =
      stepIndex < 0 ? 0 : (progressByStep[stepIndex] ?? progressByStep[progressByStep.length - 1]);
    const items = storage.items || [];
    const colorClasses = ['c1', 'c2', 'c3', 'c4'];
    const products: Product[] = items.map((item: any, i: number) => {
      const qty = item.qty ?? item.quantity ?? 1;
      const priceEach = Number(item.price) || 0;
      const metaParts: string[] = [];
      if (item.size) metaParts.push(`Size: ${item.size}`);
      if (item.sweetness) metaParts.push(`Ngọt: ${item.sweetness}`);
      if (item.ice) metaParts.push(`Đá: ${item.ice}`);
      metaParts.push(`x${qty}`);
      const meta = metaParts.join(' · ');
      return {
        id: item.id || item.productId,
        name: item.name || 'Sản phẩm',
        meta: meta || 'x' + qty,
        price: this.formatMoneyForOrder(priceEach * qty),
        emoji: '🍵',
        colorClass: colorClasses[i % colorClasses.length],
        image: item.image,
      };
    });
    const totalNum = Number(storage.total) || 0;
    const dateStr = storage.date
      ? this.formatOrderDate(storage.date)
      : '';
    return {
      id: String(id),
      date: dateStr,
      status: status as Order['status'],
      statusLabel,
      products,
      total: this.formatMoneyForOrder(totalNum),
      activeStep: stepIndex,
      progressPercent,
      deliveryAgency: storage.deliveryAgency || 'Chưa xác định',
    };
  }

  /** Format ngày đơn hàng kèm giờ phút (giống order-tracking). */
  formatOrderDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private formatMoneyForOrder(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(value || 0)) + '₫';
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // Xử lý đường dẫn ảnh, đảm bảo bắt đầu bằng /
    return '/' + imagePath.replace(/^\//, '');
  }

  private updateTabCounts(): void {
    const list = this.orders;
    const all = list.length;
    this.tabs = [
      { status: 'all', icon: '🛒', label: 'Tất cả', count: all },
      {
        status: 'pending',
        icon: '🕐',
        label: 'Xác nhận đơn hàng',
        count: list.filter((o) => o.status === 'pending').length,
      },
      {
        status: 'processing',
        icon: '📦',
        label: 'Chuẩn bị đơn hàng',
        count: list.filter((o) => o.status === 'processing').length,
      },
      {
        status: 'ready',
        icon: '🏪',
        label: 'Chờ lấy hàng',
        count: list.filter((o) => o.status === 'ready').length,
      },
      {
        status: 'shipping',
        icon: '🚚',
        label: 'Đang giao hàng',
        count: list.filter((o) => o.status === 'shipping').length,
      },
      {
        status: 'completed',
        icon: '⭐',
        label: 'Giao thành công',
        count: list.filter((o) => o.status === 'completed').length,
      },
    ];
  }

  filterOrders(status: string): void {
    this.activeTab = status;
    this.currentPage = 1;
    this.filteredOrders =
      status === 'all' ? [...this.orders] : this.orders.filter((o) => o.status === status);
    this.updatePagination();
  }

  private updatePagination(): void {
    const total = this.filteredOrders.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  get visiblePageNumbers(): number[] {
    const n = this.PAGINATION_VISIBLE;
    const total = this.totalPages;
    if (total <= n) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.floor((this.currentPage - 1) / n) * n + 1;
    const end = Math.min(start + n - 1, total);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get showEllipsisAfter(): boolean {
    if (this.totalPages <= this.PAGINATION_VISIBLE) return false;
    const n = this.PAGINATION_VISIBLE;
    const start = Math.floor((this.currentPage - 1) / n) * n + 1;
    const end = Math.min(start + n - 1, this.totalPages);
    return end < this.totalPages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    // TODO: gọi API phân trang thực tế ở đây
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  viewDetail(order: Order): void {
    this.router.navigate(['/order-tracking'], { queryParams: { orderId: order.id } });
  }

  cancelOrder(order: Order): void {
    this.orderToCancel = order;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
  }

  confirmCancelOrder(): void {
    if (!this.orderToCancel) return;
    const id = this.orderToCancel.id;

    const token = localStorage.getItem('token');
    if (token) {
      this.orderService.cancelOrder(id).subscribe({
        next: () => {
          this.orders = this.orders.filter((o) => o.id !== id);
          this.filteredOrders = this.filteredOrders.filter((o) => o.id !== id);
          this.updateTabCounts();
          this.closeCancelModal();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to cancel order on server', err);
          this.closeCancelModal();
        }
      });
    } else {
      this.orders = this.orders.filter((o) => o.id !== id);
      this.filteredOrders = this.filteredOrders.filter((o) => o.id !== id);
      try {
        const raw = JSON.parse(localStorage.getItem('orders') || '[]') as any[];
        const next = raw.filter((o: any) => (o.id || o.orderId) !== id);
        localStorage.setItem('orders', JSON.stringify(next));
      } catch (e) {
        console.error('confirmCancelOrder sync localStorage', e);
      }
      this.updateTabCounts();
      this.closeCancelModal();
    }
  }

  trackOrder(order: Order): void {
    this.router.navigate(['/order-tracking'], {
      queryParams: { orderId: order.id },
      fragment: 'order-status',
    });
  }

  reorder(order: Order): void {
    this.router.navigate(['/order-tracking'], {
      queryParams: { orderId: order.id },
      fragment: 'order-items-section',
    });
  }

  reviewOrder(order: Order): void {
    this.router.navigate(['/order-tracking'], {
      queryParams: { orderId: order.id, openReview: '1' },
      fragment: 'review-section',
    });
  }
}
