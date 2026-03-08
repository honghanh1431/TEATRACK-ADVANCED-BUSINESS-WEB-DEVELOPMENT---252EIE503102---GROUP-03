import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

declare const Chart: any;
declare const ExcelJS: any;
declare const saveAs: any;

interface Order {
  id?: string;
  orderId?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  total?: number;
  totalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  customer?: { name?: string; phone?: string; address?: string };
  items?: Array<{
    productId?: string;
    id?: string;
    productName?: string;
    name?: string;
    price?: number;
    image?: string;
    specs?: string;
    options?: string | string[];
    size?: string;
    sweetness?: string;
    ice?: string;
    toppings?: string[];
    qty?: number;
    quantity?: number;
  }>;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
}

interface Product {
  id?: string;
  name?: string;
  category?: string;
  type?: string;
  price?: number;
  priceL?: number;
  vipPriceM?: number;
  vipPriceL?: number;
  image?: string;
  img?: string;
  imageUrl?: string;
  thumbnail?: string;
  visible?: boolean;
  special?: boolean;
  description?: string;
  detail?: string;
}

interface DashboardSlice {
  revenue: number;
  ordersCount: number;
  productsSold: number;
  revenueDelta: number;
  ordersDelta: number;
  productsSoldDelta: number;
  revenueDiff: number;
  ordersDiff: number;
  productsSoldDiff: number;
  lineChart: { labels: string[]; revenue: number[]; cost: number[] };
  doughnut: { data: number[]; centerValue: string; centerUnit: string };
}
interface AdminDashboardData {
  branches?: string[];
  data?: Record<string, Record<string, DashboardSlice>>;
}

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class Admin implements OnInit, AfterViewInit, OnDestroy {
  ORDERS_ALL: Order[] = [];
  PRODUCTS_ALL: Product[] = [];
  currentPage = 1;
  totalPages = 1;
  filterState = { category: '', search: '' };
  /** value '1' = Tất cả danh mục (trả về '' để không lọc, show cả 6 loại). 2–7 = tên danh mục để lọc. */
  private readonly CATEGORY_ID_TO_NAME: Record<string, string> = {
    '1': '',
    '2': 'Loại Thuần Trà',
    '3': 'Loại Trà Sữa',
    '4': 'Loại Trà Latte',
    '5': 'Thức Uống Hot',
    '6': 'Thức Uống Mới',
    '7': 'Loại Trà Trái Cây',
  };
  /** Tối đa 4 ảnh khi thêm sản phẩm (data URLs). */
  private addProductImageUrls: string[] = [];
  private readonly ADD_PRODUCT_MAX_IMAGES = 4;
  /** Tối đa 4 ảnh khi chỉnh sửa sản phẩm (data URLs). */
  private editProductImageUrls: string[] = [];
  private readonly EDIT_PRODUCT_MAX_IMAGES = 4;
  /** Data URI 1x1 transparent PNG: dùng thay placeholder.png để tránh 404 và vòng lặp onerror. */
  private static readonly PLACEHOLDER_IMG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  pendingDeleteProductId: string | null = null;
  private routerSub?: Subscription;
  private _productFiltersInitialized = false;
  private dashboardData: AdminDashboardData | null = null;
  private filterListener = () => this.applyDashboardFilter();
  private boundClick = (e: MouseEvent) => this.onDocumentClick(e);
  private boundKeydown = (e: KeyboardEvent) => this.onDocumentKeydown(e);
  private successKeydown = (e: KeyboardEvent) => this.onSuccessEscape(e);
  private storageOrdersHandler = (e: StorageEvent) => this.onStorageOrders(e);

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    try {
      const authAdmin = localStorage.getItem('authAdmin');
      if (!authAdmin) {
        setTimeout(() => this.showAlertModal('Vui lòng đăng nhập với tài khoản quản trị.'), 0);
        this.router.navigateByUrl('/login-admin');
        return;
      }
    } catch {
      this.router.navigateByUrl('/login-admin');
    }
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects?.includes('admin-dashboard')) {
          this.refreshData();
          this.scrollToFragmentProducts();
        }
      });
  }

  ngAfterViewInit(): void {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('authAdmin')) return;
    setTimeout(() => {
      try {
        this.init();
        this.scrollToFragmentProducts();
      } catch (err) {
        console.error('Admin init error:', err);
      }
    }, 0);
  }

  private scrollToFragmentProducts(): void {
    if (typeof window === 'undefined' || window.location.hash !== '#products') return;
    setTimeout(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('admin:filters', this.filterListener);
      window.removeEventListener('storage', this.storageOrdersHandler);
    }
    this.chartInstances.forEach((c) => {
      try {
        c?.destroy();
      } catch (_) {}
    });
    this.chartInstances = [];
    document.removeEventListener('click', this.boundClick);
    document.removeEventListener('keydown', this.boundKeydown);
    document.removeEventListener('keydown', this.successKeydown);
  }

  /** Sort đơn hàng theo ngày giảm dần (mới nhất trước). */
  private sortOrdersByDateDesc(): void {
    this.ORDERS_ALL.sort((a, b) => {
      const tA = new Date((a.date || a.createdAt) as string | number | undefined || 0).getTime();
      const tB = new Date((b.date || b.createdAt) as string | number | undefined || 0).getTime();
      return tB - tA;
    });
  }

  /** Tab khác (admin-order) sửa orders → cập nhật lại từ localStorage. */
  private onStorageOrders(e: StorageEvent): void {
    if (e.key !== 'orders' || e.newValue == null) return;
    try {
      this.ORDERS_ALL = JSON.parse(e.newValue) as Order[];
      this.sortOrdersByDateDesc();
      this.renderOrdersTable(this.ORDERS_ALL);
      this.updateOrdersStats();
    } catch (_) {}
  }

  /** Gọi khi vào lại trang admin-dashboard để luôn thấy dữ liệu mới nhất (orders + products). */
  refreshData(): void {
    this.fetchOrders();
    this.fetchProducts();
  }

  private $(s: string, r: ParentNode = document): Element | null {
    return r.querySelector(s);
  }

  fmtMoney(n: number | string): string {
    return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';
  }

  fmtDate(dateStr: string | undefined): string {
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

  t(key: string): string {
    return (window as any).adminTranslations?.[key] || key;
  }

  showSuccess(message = 'CHỈNH SỬA THÀNH CÔNG'): void {
    const modal = document.getElementById('modal-success');
    const messageEl = document.getElementById('success-message');
    if (!modal) return;
    if (messageEl) messageEl.textContent = message;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    setTimeout(() => this.hideSuccess(), 2000);
  }

  hideSuccess(): void {
    const modal = document.getElementById('modal-success');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => (modal.style.display = 'none'), 300);
  }

  private initSuccessModal(): void {
    const btn = document.getElementById('btn-close-success');
    const modal = document.getElementById('modal-success');
    if (btn) btn.addEventListener('click', () => this.hideSuccess());
    document.querySelectorAll('[data-close-success]').forEach((el) => el.addEventListener('click', () => this.hideSuccess()));
    document.addEventListener('keydown', this.successKeydown);
  }

  private onSuccessEscape(e: KeyboardEvent): void {
    const modal = document.getElementById('modal-success');
    if (e.key === 'Escape' && modal?.classList.contains('show')) this.hideSuccess();
  }

  private chartInstances: any[] = [];

  private initCharts(retryCount = 0): void {
    const maxRetries = 8;
    const revCostCtx = document.getElementById('revCostChart');
    const catPieCtx = document.getElementById('catPieChart');
    const chartReady = typeof Chart !== 'undefined';
    const domReady = !!(revCostCtx && catPieCtx);
    if (!chartReady || !domReady) {
      if (retryCount < maxRetries) {
        setTimeout(() => this.initCharts(retryCount + 1), 120);
      }
      return;
    }
    this.chartInstances.forEach((c) => {
      try {
        c?.destroy();
      } catch (_) {}
    });
    this.chartInstances = [];
    if (revCostCtx) {
      const lineChart = new Chart(revCostCtx, {
        type: 'line',
        data: {
          labels: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
          datasets: [
            {
              label: 'Doanh thu',
              data: [35, 25, 32, 38, 28, 42, 20, 80, 62, 69, 48, 32, 47, 59, 49],
              borderColor: '#ffffff',
              backgroundColor: 'transparent',
              borderWidth: 4,
              tension: 0.3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#0088ff',
              pointRadius: 6,
              pointHoverRadius: 6,
              fill: true,
            },
            {
              label: 'Chi Phí',
              data: [32, 22, 28, 35, 25, 38, 18, 60, 58, 50, 45, 30, 45, 48, 18],
              borderColor: '#00eeffff',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 4,
              tension: 0.4,
              pointBackgroundColor: '#0088ff',
              pointBorderColor: '#ffffff',
              pointRadius: 6,
              pointHoverRadius: 6,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                color: '#fff',
                font: { size: 14, weight:700 },
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 15,
              },
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#0088FF',
              bodyColor: '#0088FF',
              borderColor: '#0088FF',
              borderWidth: 2,
              padding: 10,
              displayColors: true,
            },
          },
          scales: {
            y: {
              title: {
                display: true,
                text: 'Triệu đồng (VNĐ)',
                color: '#fff',
                font: { size: 14, weight:700 },
              },
              beginAtZero: true,
              max: 100,
              ticks: { color: '#fff', font: { size: 14, weight:700 }, stepSize: 20 },
              grid: { color: 'rgba(255, 255, 255, 0.2)', drawBorder: false },
              border: { display: false },
            },
            x: {
              title: {
                display: true,
                text: 'Tháng',
                color: '#fff',
                font: { size: 14, weight:700 },
              },
              ticks: { color: '#fff', font: { size: 14, weight:700 } },
              grid: { display: false },
              border: { display: false },
            },
          },
          interaction: { intersect: false, mode: 'index' },
        },
      });
      this.chartInstances.push(lineChart);
    }
    if (catPieCtx) {
      const categoryData = [25, 9, 20, 6, 6, 4];
      const total = categoryData.reduce((a, b) => a + b, 0);
      const pieChart = new Chart(catPieCtx, {
        type: 'doughnut',
        data: {
          labels: ['Loại Thuần Trà','Loại Trà Sữa','Loại Trà Latte','Thức Uống Hot','Thức Uống Mới','Loại Trà Trái Cây'],
          datasets: [
            {
              data: categoryData,
              backgroundColor: ['#0088ff', '#1e5a9e', '#e8e8e8','#1596D5','#72D5EC','#ffffff'],
              borderRadius: 999,
              spacing: 6,
              borderWidth: 0,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              shadowBlur: 16,
              shadowOffsetY: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          centerDisplay: { value: '1.9', unit: 'K VND' },
          plugins: {
            legend: {
              position: 'bottom',
              align: 'center',
              labels: {
                color: '#ffffff',
                padding: 10,
                font: { size: 11, weight: 700 },
                usePointStyle: true,
                pointStyle: 'rect',
                boxWidth: 24,
                boxHeight: 24,
              },
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              padding: 12,
              displayColors: true,
              callbacks: {
                label: (ctx: any) => {
                  const t = (ctx.chart?.data?.datasets?.[0]?.data as number[]).reduce((a: number, b: number) => a + b, 0) || 1;
                  return `${ctx.label || ''}: ${((ctx.parsed / t) * 100).toFixed(1)}%`;
                },
              },
            },
          },
        },
        plugins: [
          {
            id: 'centerText',
            beforeDraw: (chart: any) => {
              const { ctx, chartArea } = chart;
              if (!chartArea) return;
              const centerX = (chartArea.left + chartArea.right) / 2;
              const centerY = (chartArea.top + chartArea.bottom) / 2;
              const disp = chart.options?.centerDisplay || { value: '1.9', unit: 'K VND' };
              const line1 = (disp.value || '1.9') + (disp.unit?.split(' ')[0] === 'K' ? 'K' : '');
              const line2 = disp.unit?.replace(/^K\s*/, '') || 'VND';
              ctx.save();
              ctx.font = 'bold 36px Inter, sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(line1, centerX, centerY);
              ctx.font = 'bold 16px Inter, sans-serif';
              ctx.fillText(line2, centerX, centerY + 30);
              ctx.restore();
            },
          },
        ],
      });
      this.chartInstances.push(pieChart);
    }
    this.applyDashboardFilter();
  }

  applyDashboardFilter(): void {
    if (!this.dashboardData?.data) return;
    const branch = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_branch') || 'all' : 'all';
    let month = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_month') : '';
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const byBranch = this.dashboardData.data[branch];
    const byMonth = byBranch?.[month];
    const slice = byMonth ?? this.dashboardData.data['all']?.[month];
    const fallbackMonth = Object.keys(this.dashboardData.data['all'] || {})[0] || month;
    const s = slice ?? this.dashboardData.data[branch]?.[fallbackMonth] ?? this.dashboardData.data['all']?.[fallbackMonth];
    if (!s) return;

    const fmtDelta = (delta: number) => `${delta >= 0 ? '+' : ''}${delta}%`;
    const fmtRevenueAbs = (diff: number) => {
      const abs = Math.abs(diff);
      if (abs >= 1e6) return (diff >= 0 ? '+' : '-') + (abs / 1e6).toFixed(1) + ' tr';
      if (abs >= 1000) return (diff >= 0 ? '+' : '-') + (abs / 1000).toFixed(1) + 'k';
      return (diff >= 0 ? '+' : '') + diff;
    };
    const setDeltaColor = (el: Element | null, delta: number) => {
      if (el) (el as HTMLElement).style.color = delta >= 0 ? 'rgba(255,255,255,0.95)' : '#ffc9c9';
    };

    const el = (id: string) => document.getElementById(id);
    if (el('sRevenue')) el('sRevenue')!.textContent = this.fmtMoney(s.revenue);
    if (el('sOrders')) el('sOrders')!.textContent = String(s.ordersCount) + ' ĐƠN';
    if (el('sCustomers')) el('sCustomers')!.textContent = String(s.productsSold) + ' SẢN PHẨM';
    if (el('sRevenueDelta')) {
      el('sRevenueDelta')!.textContent = fmtDelta(s.revenueDelta);
      setDeltaColor(el('sRevenueDelta'), s.revenueDelta);
    }
    if (el('sRevenueDeltaAbs')) el('sRevenueDeltaAbs')!.textContent = fmtRevenueAbs(s.revenueDiff) + ' tuần này';
    if (el('sOrdersDelta')) {
      el('sOrdersDelta')!.textContent = fmtDelta(s.ordersDelta);
      setDeltaColor(el('sOrdersDelta'), s.ordersDelta);
    }
    if (el('sOrdersDeltaAbs')) el('sOrdersDeltaAbs')!.textContent = (s.ordersDiff >= 0 ? '+' : '') + s.ordersDiff + ' tuần này';
    if (el('sCustomersDelta')) {
      el('sCustomersDelta')!.textContent = fmtDelta(s.productsSoldDelta);
      setDeltaColor(el('sCustomersDelta'), s.productsSoldDelta);
    }
    if (el('sCustomersDeltaAbs')) {
      const absStr = Math.abs(s.productsSoldDiff) >= 1000
        ? (s.productsSoldDiff >= 0 ? '+' : '-') + (Math.abs(s.productsSoldDiff) / 1000).toFixed(1) + 'k'
        : (s.productsSoldDiff >= 0 ? '+' : '') + s.productsSoldDiff;
      el('sCustomersDeltaAbs')!.textContent = absStr + ' tuần này';
    }

    const lineChart = this.chartInstances[0];
    if (lineChart && s.lineChart) {
      lineChart.data.labels = s.lineChart.labels;
      lineChart.data.datasets[0].data = s.lineChart.revenue;
      lineChart.data.datasets[1].data = s.lineChart.cost;
      lineChart.update();
    }
    const pieChart = this.chartInstances[1];
    if (pieChart && s.doughnut) {
      pieChart.data.datasets[0].data = s.doughnut.data;
      if (pieChart.options) (pieChart.options as any).centerDisplay = { value: s.doughnut.centerValue, unit: s.doughnut.centerUnit };
      pieChart.update();
    }
  }

  fetchOrders(): void {
    this.http.get<Order[]>('/data/orders.json').subscribe({
      next: (data) => {
        const fromJson = Array.isArray(data) ? data : [];
        let fromStorage: Order[] = [];
        try {
          const raw = localStorage.getItem('orders');
          if (raw) fromStorage = JSON.parse(raw) as Order[];
        } catch (_) {}
        const ids = new Set<string>();
        this.ORDERS_ALL = [];
        [...fromStorage, ...fromJson].forEach((o) => {
          const id = o.id || o.orderId || '';
          if (id && !ids.has(id)) {
            ids.add(id);
            this.ORDERS_ALL.push(o);
          }
        });
        this.sortOrdersByDateDesc();
        (window as any).currentOrders = this.ORDERS_ALL;
        this.renderOrdersTable(this.ORDERS_ALL);
        this.updateOrdersStats();
      },
      error: (err) => {
        console.error('Fetch orders error:', err);
        try {
          const raw = localStorage.getItem('orders');
          this.ORDERS_ALL = raw ? (JSON.parse(raw) as Order[]) : [];
        } catch (_) {
          this.ORDERS_ALL = [];
        }
        this.sortOrdersByDateDesc();
        const tbody = this.$('#ordersBody');
        if (tbody)
          tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Không thể tải đơn hàng</td></tr>';
        this.renderOrdersTable(this.ORDERS_ALL);
      },
    });
  }

  renderOrdersTable(orders: Order[]): void {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;
    if (!orders?.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">${this.t('admin.dashboard.noOrders') || 'Không có đơn hàng'}</td></tr>`;
      return;
    }
    const recentOrders = orders.slice(0, 10);
    const statusMap: Record<string, string> = {
      pending: 'status-badge pending',
      processing: 'status-badge processing',
      ready: 'status-badge ready',
      shipping: 'status-badge shipping',
      completed: 'status-badge completed',
      cancelled: 'status-badge cancelled',
    };
    const statusLabels: Record<string, string> = {
      pending: 'Xác nhận đơn hàng',
      processing: 'Chuẩn bị đơn hàng',
      ready: 'Chờ lấy hàng',
      shipping: 'Đang giao hàng',
      completed: 'Giao thành công',
      cancelled: 'Đã hủy',
    };
    tbody.innerHTML = recentOrders
      .map((order) => {
        const orderId = order.id || order.orderId || '';
        const customerName = order.customerName || order.customer?.name || 'Khách hàng';
        const orderDate = this.fmtDate(order.date || order.createdAt);
        const total = this.fmtMoney(order.total || order.totalAmount || 0);
        const statusLower = (order.status || '').toLowerCase().trim();
        const englishKeys = ['pending', 'processing', 'ready', 'shipping', 'completed', 'cancelled'];
        let statusKey = 'pending';
        if (englishKeys.includes(statusLower)) {
          statusKey = statusLower;
        } else if (statusLower.includes('hoàn') || statusLower.includes('complete') || statusLower.includes('thành công')) {
          statusKey = 'completed';
        } else if (statusLower.includes('hủy') || statusLower.includes('cancel')) {
          statusKey = 'cancelled';
        } else if (statusLower.includes('giao') && (statusLower.includes('đang') || statusLower.includes('shipping'))) {
          statusKey = 'shipping';
        } else if (statusLower.includes('lấy hàng') || statusLower.includes('chờ lấy') || statusLower.includes('ready')) {
          statusKey = 'ready';
        } else if (statusLower.includes('đang') || statusLower.includes('processing') || statusLower.includes('chuẩn bị') || statusLower.includes('xác nhận')) {
          statusKey = statusLower.includes('chuẩn bị') ? 'processing' : 'pending';
        }
        const badgeClass = statusMap[statusKey] || statusMap['pending'];
        const statusText = statusLabels[statusKey] || this.t(`admin.order.status.${statusKey}`) || order.status;
        const paymentLabel = order.paymentMethod || 'Tiền mặt';
        return `<tr><td>#${orderId}</td><td>${customerName}</td><td>${orderDate}</td><td><span class="${badgeClass}">${statusText}</span></td><td>${total}</td><td>${paymentLabel}</td><td><span class="btns"><button class="btn" data-edit-order="${orderId}"><img src="assets/icons/edit2.png" alt="Chỉnh sửa" aria-hidden="true"></button></span></td></tr>`;
      })
      .join('');
  }

  updateOrdersStats(): void {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(todayMidnight);
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekOrders = this.ORDERS_ALL.filter((o) => {
      const d = new Date(o.date || o.createdAt || 0);
      return d >= weekStart && d <= weekEnd;
    });
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    const lastWeekOrders = this.ORDERS_ALL.filter((o) => {
      const d = new Date(o.date || o.createdAt || 0);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
    const weekRevenue = weekOrders.reduce(
      (sum, o) => sum + (Number(o.total) || Number(o.totalAmount) || 0),
      0,
    );
    const lastWeekRevenue = lastWeekOrders.reduce(
      (sum, o) => sum + (Number(o.total) || Number(o.totalAmount) || 0),
      0,
    );
    const revenueDiff = weekRevenue - lastWeekRevenue;
    let revenueDelta =
      lastWeekRevenue > 0
        ? Math.round((revenueDiff / lastWeekRevenue) * 100)
        : weekRevenue > 0
          ? 100
          : 0;
    const ordersDiff = weekOrders.length - lastWeekOrders.length;
    let ordersDelta =
      lastWeekOrders.length > 0
        ? Math.round((ordersDiff / lastWeekOrders.length) * 100)
        : weekOrders.length > 0
          ? 100
          : 0;
    const countItems = (orders: Order[]) =>
      orders.reduce(
        (sum, o) =>
          sum + (o.items || []).reduce((s, i) => s + (i.qty ?? (i as any).quantity ?? 1), 0),
        0,
      );
    const weekProductsSold = countItems(weekOrders);
    const lastWeekProductsSold = countItems(lastWeekOrders);
    const productsSoldDiff = weekProductsSold - lastWeekProductsSold;
    let productsSoldDelta =
      lastWeekProductsSold > 0
        ? Math.round((productsSoldDiff / lastWeekProductsSold) * 100)
        : weekProductsSold > 0
          ? 100
          : 0;

    const sOrders = this.$('#sOrders');
    const sRevenue = this.$('#sRevenue');
    const sOrdersDelta = this.$('#sOrdersDelta');
    const sOrdersDeltaAbs = this.$('#sOrdersDeltaAbs');
    const sRevenueDelta = this.$('#sRevenueDelta');
    const sRevenueDeltaAbs = this.$('#sRevenueDeltaAbs');
    const sCustomers = this.$('#sCustomers');
    const sCustomersDelta = this.$('#sCustomersDelta');
    const sCustomersDeltaAbs = this.$('#sCustomersDeltaAbs');

    if (sOrders) sOrders.textContent = String(weekOrders.length) + ' ĐƠN';
    if (sRevenue) sRevenue.textContent = this.fmtMoney(weekRevenue);
    const fmtDelta = (delta: number) => `${delta >= 0 ? '+' : ''}${delta}%`;
    const fmtRevenueAbs = (diff: number) => {
      const abs = Math.abs(diff);
      if (abs >= 1e6) return (diff >= 0 ? '+' : '-') + (abs / 1e6).toFixed(1) + ' tr';
      if (abs >= 1000) return (diff >= 0 ? '+' : '-') + (abs / 1000).toFixed(1) + 'k';
      return (diff >= 0 ? '+' : '') + diff;
    };
    const setDeltaColor = (el: Element | null, delta: number) => {
      if (el) {
        (el as HTMLElement).style.color = delta >= 0 ? 'rgba(255,255,255,0.95)' : '#ffc9c9';
      }
    };
    if (sRevenueDelta) {
      sRevenueDelta.textContent = fmtDelta(revenueDelta);
      setDeltaColor(sRevenueDelta, revenueDelta);
    }
    if (sRevenueDeltaAbs) sRevenueDeltaAbs.textContent = fmtRevenueAbs(revenueDiff) + ' tuần này';
    if (sOrdersDelta) {
      sOrdersDelta.textContent = fmtDelta(ordersDelta);
      setDeltaColor(sOrdersDelta, ordersDelta);
    }
    if (sOrdersDeltaAbs) sOrdersDeltaAbs.textContent = (ordersDiff >= 0 ? '+' : '') + ordersDiff + ' tuần này';
    if (sCustomers) sCustomers.textContent = String(weekProductsSold) + ' SẢN PHẨM';
    if (sCustomersDelta) {
      sCustomersDelta.textContent = fmtDelta(productsSoldDelta);
      setDeltaColor(sCustomersDelta, productsSoldDelta);
    }
    if (sCustomersDeltaAbs) {
      const absStr =
        Math.abs(productsSoldDiff) >= 1000
          ? (productsSoldDiff >= 0 ? '+' : '-') + (Math.abs(productsSoldDiff) / 1000).toFixed(1) + 'k'
          : (productsSoldDiff >= 0 ? '+' : '') + productsSoldDiff;
      sCustomersDeltaAbs.textContent = absStr + ' tuần này';
    }
  }

  fetchProducts(): void {
    const fromStorage = this.getProductsFromStorage();
    if (fromStorage.length > 0) {
      this.PRODUCTS_ALL = fromStorage;
      this.applyProductsLoaded();
      if (!this._productFiltersInitialized) {
        this.initProductFilters();
        this._productFiltersInitialized = true;
      }
      return;
    }
    this.http.get<Product[]>('/data/products.json').subscribe({
      next: (data) => {
        this.PRODUCTS_ALL = Array.isArray(data) ? data : [];
        this.applyProductsLoaded();
        if (!this._productFiltersInitialized) {
          this.initProductFilters();
          this._productFiltersInitialized = true;
        }
      },
      error: (err) => {
        console.error('Fetch products error:', err);
        this.PRODUCTS_ALL = [];
        const body = this.$('#productsBody');
        if (body)
          body.innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">Không thể tải sản phẩm</td></tr>';
      },
    });
  }

  private getProductsFromStorage(): Product[] {
    try {
      const raw = localStorage.getItem('products');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private applyProductsLoaded(): void {
    this.filterState = { category: '', search: '' };
    const catSelect = document.getElementById('category-filter') as HTMLSelectElement;
    if (catSelect) {
      catSelect.selectedIndex = 0;
      catSelect.value = '1';
    }
    this.applyFilters();
    this.updateProductsStats();
  }

  private getCategoryFilterValue(): string {
    const el = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (!el) return '';
    const v = (el.value ?? '').trim();
    if (v === '' || v === '1' || el.selectedIndex === 0) return '';
    return v;
  }

  private getCategoryFilterName(): string {
    const el = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (!el) return '';
    const v = (el.value ?? '').trim();
    if (v === '' || v === '1') return '';
    const name = this.CATEGORY_ID_TO_NAME[v];
    return name !== undefined ? name : v;
  }

  private initProductFilters(): void {
    const searchInput = document.getElementById('product-search');
    const categorySelect = document.getElementById('category-filter') as HTMLSelectElement | null;
    if (searchInput)
      searchInput.addEventListener('input', (e) => {
        this.filterState.search = (e.target as HTMLInputElement).value.trim();
        this.applyFilters();
      });
    if (categorySelect)
      categorySelect.addEventListener('change', () => {
        this.filterState.category = this.getCategoryFilterValue();
        this.applyFilters();
      });
  }

  private normalize(str: string | null | undefined): string {
    if (str == null) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private filterProducts(items: Product[]): Product[] {
    const el = document.getElementById('category-filter') as HTMLSelectElement | null;
    const rawVal = el ? (el.value ?? '').trim() : '';
    const isAllCategories = rawVal === '' || rawVal === '1' || (el && el.selectedIndex === 0);
    const cat = isAllCategories ? '' : this.getCategoryFilterName();
    return items.filter((item) => {
      if (cat !== '') {
        const itemCat = (item.category || item.type || '').trim();
        if (itemCat !== cat) return false;
      }
      if (this.filterState.search) {
        const query = this.normalize(this.filterState.search);
        const haystack = this.normalize([item.name, item.category, item.type, item.id].join(' '));
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  applyFilters(): void {
    this.filterState.category = this.getCategoryFilterName();
    const filtered = this.filterProducts(this.PRODUCTS_ALL);
    this.currentPage = 1;
    this.renderProducts(filtered);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const f = this.filterProducts(this.PRODUCTS_ALL);
    this.renderProducts(f);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  private renderProducts(items: Product[]): void {
    const body = this.$('#productsBody');
    if (!body) return;
    body.innerHTML = '';

    if (items.length === 0) {
      body.innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#ffffff;font-weight:700">Không có sản phẩm</td></tr>';
      return;
    }
    items.forEach((p: Product) => {
      const tr = document.createElement('tr');
      const price = this.fmtMoney(p.price ?? 0);
      const imageUrl =
        p.image || p.img || p.imageUrl || p.thumbnail || Admin.PLACEHOLDER_IMG;
      const visible = p.visible !== false;
      const pid = (p?.id ?? '').replace(/"/g, '&quot;');
      tr.innerHTML = `<td>${p?.id ?? ''}</td><td>${p?.name ?? ''}</td><td>${p?.category ?? p?.type ?? ''}</td><td><img src="${imageUrl}" alt="${(p?.name ?? '').replace(/"/g, '&quot;')}" class="product-thumb" onerror="this.src='${Admin.PLACEHOLDER_IMG}'"></td><td>${price}</td><td class="col-visible"><label class="visible-check-wrap"><input type="checkbox" class="product-visible-cb" data-product-id="${pid}" ${visible ? 'checked' : ''} aria-label="Hiển thị trên menu"></label></td><td><span class="btns"><button class="btn" data-edit="${pid}"><img src="assets/icons/edit2.png" alt="" aria-hidden="true"></button><button class="btn" data-delete="${pid}"><img src="assets/icons/delete2.png" alt="" aria-hidden="true"></button></span></td>`;
      body.appendChild(tr);
    });
    if (body) this.bindVisibleCheckboxes(body as HTMLElement);
  }

  private bindVisibleCheckboxes(container: HTMLElement): void {
    container.querySelectorAll('.product-visible-cb').forEach((cb) => {
      const input = cb as HTMLInputElement;
      const id = input.getAttribute('data-product-id');
      if (!id) return;
      input.addEventListener('change', () => {
        const product = this.PRODUCTS_ALL.find((p) => p.id === id);
        if (!product) return;
        product.visible = input.checked;
        localStorage.setItem('products', JSON.stringify(this.PRODUCTS_ALL));
        this.showNotification(
          product.visible ? 'Sản phẩm sẽ hiển thị trên menu' : 'Sản phẩm đã ẩn khỏi menu',
          'info',
        );
      });
    });
  }

  updateProductsStats(): void {
    const sProducts = this.$('#sProducts');
    if (sProducts) sProducts.textContent = String(this.PRODUCTS_ALL.length);
  }

  private getOrderItemDetailLines(item: any): string[] {
    const lines: string[] = [];
    const ngot = item.sweetness || 'Ít';
    const da = item.ice || 'Ít';
    const qty = item.qty ?? item.quantity ?? 1;
    if (item.size) {
      const first = `Size ${item.size} - Ngọt: ${ngot} - Đá: ${da}`;
      lines.push(
        Array.isArray(item.toppings) && item.toppings.length ? first + ',' : first,
      );
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
    if (lines.length <= 1 && (item.specs || item.options)) {
      const opts = Array.isArray(item.options) ? item.options.join(', ') : (item.specs || (item.options as string) || '');
      if (opts) lines.splice(lines.length - 1, 0, opts);
    }
    if (item.note && !lines.some((l: string) => l.includes(item.note))) {
      lines.push(item.note);
    }
    return lines;
  }

  openOrderDetailModal(orderId: string): void {
    document.querySelectorAll('.modal').forEach((m) => {
      if (m.id !== 'modal-order-detail') (m as HTMLElement).style.display = 'none';
    });
    const modal = document.getElementById('modal-order-detail');
    if (!modal) return;
    const order = this.ORDERS_ALL.find((o) => (o.id || o.orderId) == orderId);
    if (!order) {
      this.showAlertModal('Không tìm thấy đơn hàng.');
      return;
    }
    const set = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('order-id', order.id || order.orderId || '');
    const dateTime = this.fmtDate(order.date || order.createdAt).split(' ');
    set('order-date', dateTime[0] || '');
    set('order-time', dateTime[1] || '');
    set('customer-name', order.customerName || order.customer?.name || '');
    set('customer-phone', order.customerPhone ?? order.customer?.phone ?? '');
    set('customer-address', order.customerAddress ?? order.customer?.address ?? '');
    const statusSelect = document.getElementById('order-status-dropdown') as HTMLSelectElement | null;
    if (statusSelect) {
      const statusMap: Record<string, string> = {
        pending: 'pending',
        processing: 'processing',
        ready: 'ready',
        shipping: 'shipping',
        completed: 'completed',
        cancelled: 'cancelled',
        'Chờ xác nhận': 'pending',
        'Xác nhận đơn hàng': 'pending',
        'Đang xử lý': 'processing',
        'Chuẩn bị đơn hàng': 'processing',
        'Chờ lấy hàng': 'ready',
        'Đang giao hàng': 'shipping',
        'Hoàn tất': 'completed',
        'Giao thành công': 'completed',
        'Đã giao hàng': 'completed',
        'Đã hủy': 'cancelled',
      };
      const st = (order.status || '').toString().trim();
      const dropdownVal = statusMap[st] ?? statusMap[st.toLowerCase()] ?? 'pending';
      statusSelect.value = dropdownVal;
      statusSelect.dataset['orderId'] = order.id || order.orderId || '';
      statusSelect.dataset['originalStatus'] = st;
    }
    const itemsContainer = document.getElementById('order-items');
    if (itemsContainer && order.items) {
      itemsContainer.innerHTML = order.items
        .map((item) => {
          const productId = item.productId || item.id;
          const product = productId ? this.PRODUCTS_ALL.find((p) => p.id === productId) : null;
          let imgUrl =
            item.image ||
            product?.image ||
            product?.img ||
            product?.imageUrl ||
            Admin.PLACEHOLDER_IMG;
          if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('/')) {
            imgUrl = '/' + imgUrl;
          }
          const rawName = item.name || product?.name || item.productName || 'Sản phẩm';
          const name = String(rawName).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const lines = this.getOrderItemDetailLines(item);
          const qty = item.qty ?? (item as any).quantity ?? 1;
          const totalPrice = (item.price || 0) * qty;
          const price = this.fmtMoney(totalPrice);
          const specsHtml =
            lines.length > 0
              ? lines
                  .map(
                    (line) =>
                      `<p class="item-detail-line">${String(line).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</p>`,
                  )
                  .join('')
              : '';
          return `<div class="order-item"><img src="${imgUrl}" alt="${name}" class="item-image"><div class="item-details"><div class="item-name">${name}</div><div class="item-specs">${specsHtml}</div></div><div class="item-price">${price}</div></div>`;
        })
        .join('');
    }
    set('subtotal', this.fmtMoney(order.subtotal || order.total || 0));
    set('shipping-fee', this.fmtMoney((order as any).shippingFee || 0));
    set('discount', this.fmtMoney((order as any).discount || 0));
    set('total-amount', this.fmtMoney(order.total || (order as any).totalAmount || 0));
    modal.style.display = 'flex';
    modal.classList.add('show');
  }

  closeOrderDetailModal(): void {
    const modal = document.getElementById('modal-order-detail');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => (modal.style.display = 'none'), 300);
    this.showNotification('Đã đóng chi tiết đơn hàng', 'info');
  }

  showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    document.querySelectorAll('.notification-toast').forEach((n) => n.remove());
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    const icons: Record<string, string> = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    notification.innerHTML = `<span class="notification-icon">${icons[type] || icons['info']}</span><span class="notification-message">${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  openAddProductModal(): void {
    const modal = document.getElementById('modal-add-product');
    if (!modal) return;
    const form = document.getElementById('form-add-product') as HTMLFormElement;
    if (form) form.reset();
    const preview = document.getElementById('add-image-preview');
    if (preview) (preview as HTMLElement).style.display = 'none';
    const categorySelect = document.getElementById('add-product-category');
    if (categorySelect && this.PRODUCTS_ALL.length > 0) {
      const categories = Array.from(
        new Set(this.PRODUCTS_ALL.map((p) => (p.category || p.type || '').trim()).filter(Boolean)),
      ).sort();
      categorySelect.innerHTML = '<option value="">Chọn loại sản phẩm</option>';
      categories.forEach((cat) => {
        const o = document.createElement('option');
        o.value = cat;
        o.textContent = cat;
        categorySelect.appendChild(o);
      });
    }
    modal.style.display = 'flex';
  }

  closeAddProductModal(): void {
    const modal = document.getElementById('modal-add-product');
    const form = document.getElementById('form-add-product') as HTMLFormElement;
    const fileInput = document.getElementById('add-product-image') as HTMLInputElement;
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    this.addProductImageUrls = [];
    this.renderAddProductPreviews();
    if (fileInput) fileInput.value = '';
  }

  private renderAddProductPreviews(): void {
    const grid = document.getElementById('add-image-preview-grid');
    if (!grid) return;
    const slots = grid.querySelectorAll<HTMLElement>('.image-preview-slot');
    this.addProductImageUrls.slice(0, this.ADD_PRODUCT_MAX_IMAGES).forEach((url, i) => {
      const slot = slots[i];
      if (!slot) return;
      const placeholder = slot.querySelector<HTMLElement>('.slot-placeholder');
      const img = slot.querySelector<HTMLImageElement>('.slot-preview-img');
      const removeBtn = slot.querySelector<HTMLElement>('.slot-remove-btn');
      if (placeholder) placeholder.style.display = 'none';
      if (img) {
        img.src = url;
        img.style.display = 'block';
      }
      if (removeBtn) removeBtn.style.display = 'flex';
    });
    for (let i = this.addProductImageUrls.length; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) break;
      const placeholder = slot.querySelector<HTMLElement>('.slot-placeholder');
      const img = slot.querySelector<HTMLImageElement>('.slot-preview-img');
      const removeBtn = slot.querySelector<HTMLElement>('.slot-remove-btn');
      if (placeholder) placeholder.style.display = 'flex';
      if (img) {
        img.src = '';
        img.style.display = 'none';
      }
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  private initAddProductImageUpload(): void {
    const grid = document.getElementById('add-image-preview-grid');
    const fileInput = document.getElementById('add-product-image') as HTMLInputElement;
    if (!grid || !fileInput) return;
    grid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('.slot-remove-btn') ||
        (target.closest('.slot-preview-img') && !target.closest('.slot-remove-btn'))
      )
        return;
      if (target.closest('.image-preview-slot')) fileInput.click();
    });
    grid.addEventListener('click', (e) => {
      const removeBtn = (e.target as HTMLElement).closest('.slot-remove-btn');
      if (!removeBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const slot = removeBtn.closest('.image-preview-slot');
      const idx = slot ? parseInt((slot as HTMLElement).getAttribute('data-slot') || '0', 10) : 0;
      if (idx >= 0 && idx < this.addProductImageUrls.length) {
        this.addProductImageUrls.splice(idx, 1);
        this.renderAddProductPreviews();
      }
    });
    fileInput.addEventListener('change', (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const imageFiles = files.filter((f) => f.type.startsWith('image/')).slice(0, this.ADD_PRODUCT_MAX_IMAGES - this.addProductImageUrls.length);
      for (const file of imageFiles) {
        if (file.size > 5 * 1024 * 1024) {
          this.showAlertModal('Kích thước file không được vượt quá 5MB.');
          continue;
        }
      }
      const toAdd = imageFiles.filter((f) => f.size <= 5 * 1024 * 1024);
      if (toAdd.length === 0 && imageFiles.length > 0) return;
      let loaded = 0;
      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = (ev.target?.result as string) || '';
          if (dataUrl && this.addProductImageUrls.length < this.ADD_PRODUCT_MAX_IMAGES) {
            this.addProductImageUrls.push(dataUrl);
          }
          loaded++;
          if (loaded === toAdd.length) {
            this.addProductImageUrls = this.addProductImageUrls.slice(0, this.ADD_PRODUCT_MAX_IMAGES);
            this.renderAddProductPreviews();
          }
        };
        reader.readAsDataURL(file);
      });
      (e.target as HTMLInputElement).value = '';
    });
  }

  private parsePrice(value: string | number | null | undefined): number {
    if (value == null) return 0;
    const cleaned = String(value).replace(/[^0-9]/g, '');
    return parseFloat(cleaned) || 0;
  }

  private initAddProductForm(): void {
    const form = document.getElementById('form-add-product');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const maxId = Math.max(
        ...this.PRODUCTS_ALL.map((p) => {
          const num = parseInt(String(p.id).replace(/\D/g, ''), 10);
          return isNaN(num) ? 0 : num;
        }),
        0,
      );
      const newId = `NG${String(maxId + 1).padStart(2, '0')}`;
      const data: Product & { priceL?: number; vipPriceM?: number; vipPriceL?: number } = {
        id: newId,
        name: (document.getElementById('add-product-name') as HTMLInputElement)?.value || '',
        category:
          (document.getElementById('add-product-category') as HTMLSelectElement)?.value || '',
        visible:
          (document.getElementById('add-product-visible') as HTMLInputElement)?.checked || false,
        special:
          (document.getElementById('add-product-special') as HTMLInputElement)?.checked || false,
        price: this.parsePrice((document.getElementById('add-price-m') as HTMLInputElement)?.value),
        priceL: this.parsePrice(
          (document.getElementById('add-price-l') as HTMLInputElement)?.value,
        ),
        vipPriceM: this.parsePrice(
          (document.getElementById('add-vip-price-m') as HTMLInputElement)?.value,
        ),
        vipPriceL: this.parsePrice(
          (document.getElementById('add-vip-price-l') as HTMLInputElement)?.value,
        ),
        description:
          (document.getElementById('add-product-desc') as HTMLTextAreaElement)?.value || '',
        detail: (document.getElementById('add-product-detail') as HTMLTextAreaElement)?.value || '',
        image:
          this.addProductImageUrls[0] || Admin.PLACEHOLDER_IMG,
      };
      if (!data.name?.trim()) {
        this.showAlertModal('Vui lòng nhập tên sản phẩm.');
        return;
      }
      if (!data.category) {
        this.showAlertModal('Vui lòng chọn loại sản phẩm.');
        return;
      }
      if (data.price === 0) {
        this.showAlertModal('Vui lòng nhập giá size M.');
        return;
      }
      this.PRODUCTS_ALL.push(data);
      localStorage.setItem('products', JSON.stringify(this.PRODUCTS_ALL));
      this.applyFilters();
      this.updateProductsStats();
      this.showSuccess('THÊM SẢN PHẨM THÀNH CÔNG');
      setTimeout(() => this.closeAddProductModal(), 500);
    });
  }

  openEditProductModal(productId: string): void {
    const modal = document.getElementById('modal-edit-product');
    if (!modal) return;
    const product = this.PRODUCTS_ALL.find((p) => p.id === productId);
    if (!product) {
      this.showAlertModal('Không tìm thấy sản phẩm.');
      return;
    }
    const categorySelect = document.getElementById('edit-product-category');
    if (categorySelect && this.PRODUCTS_ALL.length > 0) {
      const categories = Array.from(
        new Set(this.PRODUCTS_ALL.map((p) => (p.category || p.type || '').trim()).filter(Boolean)),
      ).sort();
      categorySelect.innerHTML = '<option value="">Chọn loại sản phẩm</option>';
      categories.forEach((cat) => {
        const o = document.createElement('option');
        o.value = cat;
        o.textContent = cat;
        if (cat === (product.category || product.type)) o.selected = true;
        categorySelect.appendChild(o);
      });
    }
    (document.getElementById('edit-product-name') as HTMLInputElement).value = product.name || '';
    (document.getElementById('edit-product-visible') as HTMLInputElement).checked =
      product.visible !== false;
    (document.getElementById('edit-product-special') as HTMLInputElement).checked =
      product.special || false;
    (document.getElementById('edit-price-m') as HTMLInputElement).value = product.price
      ? `${product.price.toLocaleString('vi-VN')} VNĐ`
      : '';
    (document.getElementById('edit-price-l') as HTMLInputElement).value = product.priceL
      ? `${product.priceL.toLocaleString('vi-VN')} VNĐ`
      : '';
    (document.getElementById('edit-vip-price-m') as HTMLInputElement).value = product.vipPriceM
      ? `${product.vipPriceM.toLocaleString('vi-VN')} VNĐ`
      : '';
    (document.getElementById('edit-vip-price-l') as HTMLInputElement).value = product.vipPriceL
      ? `${product.vipPriceL.toLocaleString('vi-VN')} VNĐ`
      : '';
    (document.getElementById('edit-product-desc') as HTMLTextAreaElement).value =
      product.description || '';
    (document.getElementById('edit-product-detail') as HTMLTextAreaElement).value =
      product.detail || '';
    this.editProductImageUrls = product.image ? [product.image] : [];
    this.renderEditProductPreviews();
    modal.dataset['productId'] = productId;
    modal.style.display = 'flex';
  }

  closeEditProductModal(): void {
    const modal = document.getElementById('modal-edit-product');
    const fileInput = document.getElementById('edit-product-image') as HTMLInputElement;
    if (modal) {
      modal.style.display = 'none';
      delete modal.dataset['productId'];
    }
    this.editProductImageUrls = [];
    this.renderEditProductPreviews();
    if (fileInput) fileInput.value = '';
  }

  private renderEditProductPreviews(): void {
    const grid = document.getElementById('edit-image-preview-grid');
    if (!grid) return;
    const slots = grid.querySelectorAll<HTMLElement>('.image-preview-slot');
    this.editProductImageUrls.slice(0, this.EDIT_PRODUCT_MAX_IMAGES).forEach((url, i) => {
      const slot = slots[i];
      if (!slot) return;
      const placeholder = slot.querySelector<HTMLElement>('.slot-placeholder');
      const img = slot.querySelector<HTMLImageElement>('.slot-preview-img');
      const removeBtn = slot.querySelector<HTMLElement>('.slot-remove-btn');
      if (placeholder) placeholder.style.display = 'none';
      if (img) {
        img.src = url;
        img.style.display = 'block';
      }
      if (removeBtn) removeBtn.style.display = 'flex';
    });
    for (let i = this.editProductImageUrls.length; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) break;
      const placeholder = slot.querySelector<HTMLElement>('.slot-placeholder');
      const img = slot.querySelector<HTMLImageElement>('.slot-preview-img');
      const removeBtn = slot.querySelector<HTMLElement>('.slot-remove-btn');
      if (placeholder) placeholder.style.display = 'flex';
      if (img) {
        img.src = '';
        img.style.display = 'none';
      }
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  private initEditProductImageUpload(): void {
    const grid = document.getElementById('edit-image-preview-grid');
    const fileInput = document.getElementById('edit-product-image') as HTMLInputElement;
    if (!grid || !fileInput) return;
    grid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('.slot-remove-btn') ||
        (target.closest('.slot-preview-img') && !target.closest('.slot-remove-btn'))
      )
        return;
      if (target.closest('.image-preview-slot')) fileInput.click();
    });
    grid.addEventListener('click', (e) => {
      const removeBtn = (e.target as HTMLElement).closest('.slot-remove-btn');
      if (!removeBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const slot = removeBtn.closest('.image-preview-slot');
      const idx = slot ? parseInt((slot as HTMLElement).getAttribute('data-slot') || '0', 10) : 0;
      if (idx >= 0 && idx < this.editProductImageUrls.length) {
        this.editProductImageUrls.splice(idx, 1);
        this.renderEditProductPreviews();
      }
    });
    fileInput.addEventListener('change', (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const imageFiles = files
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, this.EDIT_PRODUCT_MAX_IMAGES - this.editProductImageUrls.length);
      for (const file of imageFiles) {
        if (file.size > 5 * 1024 * 1024) {
          this.showAlertModal('Kích thước file không được vượt quá 5MB.');
          continue;
        }
      }
      const toAdd = imageFiles.filter((f) => f.size <= 5 * 1024 * 1024);
      if (toAdd.length === 0 && imageFiles.length > 0) return;
      let loaded = 0;
      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = (ev.target?.result as string) || '';
          if (dataUrl && this.editProductImageUrls.length < this.EDIT_PRODUCT_MAX_IMAGES) {
            this.editProductImageUrls.push(dataUrl);
          }
          loaded++;
          if (loaded === toAdd.length) {
            this.editProductImageUrls = this.editProductImageUrls.slice(0, this.EDIT_PRODUCT_MAX_IMAGES);
            this.renderEditProductPreviews();
          }
        };
        reader.readAsDataURL(file);
      });
      (e.target as HTMLInputElement).value = '';
    });
  }

  private initEditProductForm(): void {
    const form = document.getElementById('form-edit-product');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const modal = document.getElementById('modal-edit-product');
      const productId = modal?.dataset['productId'];
      if (!productId) {
        this.showAlertModal('Không tìm thấy ID sản phẩm.');
        return;
      }
      const updatedProduct: Product = {
        id: productId,
        name: (document.getElementById('edit-product-name') as HTMLInputElement)?.value || '',
        category:
          (document.getElementById('edit-product-category') as HTMLSelectElement)?.value || '',
        visible:
          (document.getElementById('edit-product-visible') as HTMLInputElement)?.checked || false,
        special:
          (document.getElementById('edit-product-special') as HTMLInputElement)?.checked || false,
        price: this.parsePrice(
          (document.getElementById('edit-price-m') as HTMLInputElement)?.value,
        ),
        priceL: this.parsePrice(
          (document.getElementById('edit-price-l') as HTMLInputElement)?.value,
        ),
        vipPriceM: this.parsePrice(
          (document.getElementById('edit-vip-price-m') as HTMLInputElement)?.value,
        ),
        vipPriceL: this.parsePrice(
          (document.getElementById('edit-vip-price-l') as HTMLInputElement)?.value,
        ),
        description:
          (document.getElementById('edit-product-desc') as HTMLTextAreaElement)?.value || '',
        detail:
          (document.getElementById('edit-product-detail') as HTMLTextAreaElement)?.value || '',
        image: this.editProductImageUrls[0] || '',
      };
      const index = this.PRODUCTS_ALL.findIndex((p) => p.id === productId);
      if (index !== -1)
        this.PRODUCTS_ALL[index] = { ...this.PRODUCTS_ALL[index], ...updatedProduct };
      localStorage.setItem('products', JSON.stringify(this.PRODUCTS_ALL));
      this.applyFilters();
      this.showSuccess('CHỈNH SỬA THÀNH CÔNG');
      setTimeout(() => this.closeEditProductModal(), 500);
    });
  }

  openDeleteConfirmModal(productId: string): void {
    const product = this.PRODUCTS_ALL.find((p) => p.id === productId);
    this.pendingDeleteProductId = productId;
    const hasName = product && String(product.name || '').trim() !== '';
    const displayText = hasName ? String(product!.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : 'này';
    const messageEl = document.querySelector('.confirm-message');
    if (messageEl) {
      const namePart = hasName
        ? `<span class="confirm-product-name">${displayText}</span>`
        : `${displayText}`;
      messageEl.innerHTML = `Bạn có chắc chắn muốn xóa sản phẩm ${namePart} ?<br><span class="confirm-warning-line">Sau khi xóa, bạn sẽ không thể khôi phục.</span>`;
    }
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    }
  }

  closeDeleteConfirmModal(): void {
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        this.pendingDeleteProductId = null;
      }, 300);
    }
  }

  confirmDeleteProduct(): void {
    if (!this.pendingDeleteProductId) return;
    const index = this.PRODUCTS_ALL.findIndex((p) => p.id === this.pendingDeleteProductId);
    if (index !== -1) this.PRODUCTS_ALL.splice(index, 1);
    localStorage.setItem('products', JSON.stringify(this.PRODUCTS_ALL));
    this.applyFilters();
    this.updateProductsStats();
    this.closeDeleteConfirmModal();
    this.closeEditProductModal();
    this.showSuccess('XÓA SẢN PHẨM THÀNH CÔNG');
  }

  private initDeleteConfirmModal(): void {
    const btnConfirm = document.getElementById('btn-confirm-delete');
    if (btnConfirm) btnConfirm.addEventListener('click', () => this.confirmDeleteProduct());
    document
      .querySelectorAll('[data-close-delete]')
      .forEach((btn) => btn.addEventListener('click', () => this.closeDeleteConfirmModal()));
  }

  handleDeleteProduct(productId: string): void {
    this.openDeleteConfirmModal(productId);
  }

  private init(): void {
    this.http.get<AdminDashboardData>('/data/admin-dashboard.json').subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.applyDashboardFilter();
      },
      error: () => {},
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('admin:filters', this.filterListener);
      window.addEventListener('storage', this.storageOrdersHandler);
    }

    const lang =
      typeof localStorage !== 'undefined' ? localStorage.getItem('app.lang') || 'vi' : 'vi';
    this.reloadAdminTranslations(lang);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => this.initCharts(), 100);
      });
    });
    this.fetchOrders();
    this.fetchProducts();
    this.initSuccessModal();
    this.initDeleteConfirmModal();
    this.initAddProductImageUpload();
    this.initAddProductForm();
    this.initEditProductImageUpload();
    this.initEditProductForm();
    const btnAdd = document.getElementById('btn-add-product');
    if (btnAdd) btnAdd.addEventListener('click', () => this.openAddProductModal());
    document.addEventListener('click', this.boundClick);
    document.addEventListener('keydown', this.boundKeydown);
    const btnSaveOrder = document.getElementById('btn-save-order');
    if (btnSaveOrder) {
      btnSaveOrder.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const statusDropdown = document.getElementById(
          'order-status-dropdown',
        ) as HTMLSelectElement;
        const orderId = document.getElementById('order-id')?.textContent?.trim();
        if (!statusDropdown || !orderId) return;
        const newStatus = statusDropdown.value;
        const order = this.ORDERS_ALL.find((o) => (o.id || o.orderId) == orderId);
        if (order) {
          order.status = newStatus;
          this.sortOrdersByDateDesc();
          try {
            localStorage.setItem('orders', JSON.stringify(this.ORDERS_ALL));
          } catch (_) {}
          this.renderOrdersTable(this.ORDERS_ALL);
        }
        const orderModal = document.getElementById('modal-order-detail');
        if (orderModal) {
          orderModal.classList.remove('show');
          setTimeout(() => (orderModal.style.display = 'none'), 300);
        }
        setTimeout(() => this.showSuccess('Cập nhật đơn hàng thành công'), 400);
      });
    }
    (window as any).reloadAdminTranslations = (lang: string) => this.reloadAdminTranslations(lang);
    (window as any).renderOrdersTable = (orders: Order[]) => this.renderOrdersTable(orders);
    this.initAlertModal();
    this.initExportReport();
    this.initTopbarDropdowns();
  }

  private initAlertModal(): void {
    const modal = document.getElementById('modal-alert');
    const msgEl = document.getElementById('alert-message');
    const btnOk = document.getElementById('btn-alert-ok');
    if (!modal || !msgEl) return;
    const close = () => this.closeAlertModal();
    document.querySelectorAll('[data-close-alert]').forEach((el) => el.addEventListener('click', close));
    if (btnOk) btnOk.addEventListener('click', close);
  }

  showAlertModal(message: string, title = 'Thông báo'): void {
    const modal = document.getElementById('modal-alert');
    const titleEl = document.getElementById('alert-title');
    const msgEl = document.getElementById('alert-message');
    if (!modal || !msgEl) return;
    if (titleEl) titleEl.textContent = title;
    msgEl.textContent = message;
    document.querySelectorAll('.modal').forEach((m) => {
      if (m.id !== 'modal-alert') (m as HTMLElement).style.display = 'none';
    });
    (modal as HTMLElement).style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }

  private closeAlertModal(): void {
    const modal = document.getElementById('modal-alert');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
  }

  private initExportReport(): void {
    const btn = document.getElementById('btnExportReport');
    if (!btn) return;
    btn.addEventListener('click', () => this.exportExcelReport());
  }

  private toCSVRow(arr: string[]): string {
    return arr.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  }

  /** Xuất báo cáo Excel: Dashboard, Danh sách đơn, Top sản phẩm, Biểu đồ doanh thu (số liệu). */
  async exportExcelReport(): Promise<void> {
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      return;
    }
    const orders = this.ORDERS_ALL || [];
    const totalRevenue = orders.reduce(
      (sum, o) => sum + (Number(o.total) || Number((o as any).totalAmount) || 0),
      0,
    );
    const workbook = new ExcelJSLib.Workbook();
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };

    /* ================= DASHBOARD ================= */
    const dashboard = workbook.addWorksheet('Dashboard', { views: [{ state: 'frozen', ySplit: 1 }] });
    dashboard.mergeCells('A1:E1');
    const titleCell = dashboard.getCell('A1');
    titleCell.value = 'HỒNG TRÀ NGÔ GIA - BÁO CÁO TỔNG KẾT';
    titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0088FF' } };
    dashboard.addRow([]);
    dashboard.addRow(['Ngày xuất báo cáo', new Date().toLocaleDateString('vi-VN')]);
    dashboard.addRow(['Tổng đơn hàng', orders.length]);
    dashboard.addRow(['Tổng doanh thu (VNĐ)', totalRevenue.toLocaleString('vi-VN')]);
    dashboard.getColumn(1).width = 25;
    dashboard.getColumn(2).width = 30;

    /* ================= DANH SÁCH ĐƠN ================= */
    const orderSheet = workbook.addWorksheet('Danh sách đơn');
    orderSheet.columns = [
      { header: 'Mã đơn', key: 'code', width: 18 },
      { header: 'Khách hàng', key: 'customer', width: 25 },
      { header: 'Thời gian', key: 'time', width: 22 },
      { header: 'Trạng thái', key: 'status', width: 18 },
      { header: 'Thanh toán', key: 'payment', width: 16 },
      { header: 'Tổng tiền (VNĐ)', key: 'total', width: 18 },
    ];
    orderSheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    orders.forEach((o) => {
      const dateStr = o.date || (o as any).createdAt || '';
      const timeLabel = dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';
      orderSheet.addRow({
        code: '#' + (o.id || o.orderId || ''),
        customer: o.customerName || (o.customer as any)?.name || '',
        time: timeLabel,
        status: o.status || '',
        payment: o.paymentMethod || 'Tiền mặt',
        total: (Number(o.total) || Number((o as any).totalAmount) || 0).toLocaleString('vi-VN'),
      });
    });

    /* ================= TOP SẢN PHẨM ================= */
    const productSheet = workbook.addWorksheet('Top sản phẩm');
    productSheet.columns = [
      { header: 'Sản phẩm', key: 'name', width: 35 },
      { header: 'Số lượng bán', key: 'qty', width: 18 },
    ];
    productSheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    const productQty: Record<string, { name: string; qty: number }> = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const name =
          item.name ||
          item.productName ||
          this.PRODUCTS_ALL.find((p) => p.id === (item.productId || item.id))?.name ||
          'Không xác định';
        const key = (item.productId || item.id || name) as string;
        const qty = item.qty ?? item.quantity ?? 1;
        if (!productQty[key]) productQty[key] = { name, qty: 0 };
        productQty[key].name = name;
        productQty[key].qty += Number(qty) || 1;
      });
    });
    const topProducts = Object.values(productQty)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 50);
    topProducts.forEach((p) => productSheet.addRow({ name: p.name, qty: p.qty }));

    /* ================= 📈 BIỂU ĐỒ DOANH THU (số liệu theo ngày) ================= */
    const chartSheet = workbook.addWorksheet('Biểu đồ doanh thu');
    chartSheet.columns = [
      { header: 'Ngày', key: 'date', width: 18 },
      { header: 'Số đơn', key: 'orders', width: 12 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 22 },
    ];
    chartSheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    const byDate: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      const d = o.date || (o as any).createdAt;
      const dateKey = d ? new Date(d).toLocaleDateString('vi-VN') : 'Không rõ';
      if (!byDate[dateKey]) byDate[dateKey] = { orders: 0, revenue: 0 };
      byDate[dateKey].orders += 1;
      byDate[dateKey].revenue += Number(o.total) || Number((o as any).totalAmount) || 0;
    });
    Object.entries(byDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(([date, v]) => {
        chartSheet.addRow({
          date,
          orders: v.orders,
          revenue: v.revenue.toLocaleString('vi-VN'),
        });
      });

    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);
    saveAsLib(new Blob([buffer]), `HongTraNgoGia_Sales_Report_${today}.xlsx`);
    this.showNotification('Đã xuất báo cáo Excel thành công', 'success');
  }

  private initTopbarDropdowns(): void {
    const ddUserBtn = document.getElementById('ddUserBtn');
    const ddUserMenu = document.getElementById('ddUserMenu');
    const ddMoreBtn = document.getElementById('ddMoreBtn');
    const ddMoreMenu = document.getElementById('ddMoreMenu');
    const branchMap: Record<string, string> = {
      all: 'Tất cả các chi nhánh',
      '1': '244 đường số 8 - H071',
      '2': '60 đường Nguyễn An Ninh - H246',
      '3': '24 đường Lý Thường Kiệt - H033',
    };
    if (ddUserBtn && ddUserMenu) {
      ddUserBtn.innerHTML =
        'Chi nhánh: <strong id="branchLabel">Tất cả</strong> <span class="caret" aria-hidden="true">▾</span>';
      ddUserMenu.innerHTML =
        '<button role="menuitem" data-branch="all" type="button">Tất cả các chi nhánh</button>' +
        '<button role="menuitem" data-branch="1" type="button">244 đường số 8 - H071</button>' +
        '<button role="menuitem" data-branch="2" type="button">60 đường Nguyễn An Ninh - H246</button>' +
        '<button role="menuitem" data-branch="3" type="button">24 đường Lý Thường Kiệt - H033</button>';
      const branchLabel = document.getElementById('branchLabel');
      const savedBranch = localStorage.getItem('admin_branch') || 'all';
      if (branchLabel) branchLabel.textContent = branchMap[savedBranch] || 'Tất cả';
      ddUserMenu.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest('button[role="menuitem"]');
        if (!b) return;
        const val = b.getAttribute('data-branch') || 'all';
        localStorage.setItem('admin_branch', val);
        if (branchLabel) branchLabel.textContent = branchMap[val] || 'Tất cả';
        window.dispatchEvent(new CustomEvent('admin:filters', { detail: { branch: val } }));
      });
    }
    if (ddMoreBtn && ddMoreMenu) {
      const now = new Date();
      const currentMonthVal = now.toISOString().slice(0, 7);
      const currentMonthLabel =
        (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
      ddMoreBtn.innerHTML =
        'Tháng: <strong id="monthLabel">' +
        currentMonthLabel +
        '</strong> <span class="caret" aria-hidden="true">▾</span>';
      ddMoreMenu.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
        const val = d.toISOString().slice(0, 7);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('role', 'menuitem');
        btn.setAttribute('data-value', val);
        btn.textContent = label;
        ddMoreMenu.appendChild(btn);
      }
      const monthLabel = document.getElementById('monthLabel');
      const savedMonth = localStorage.getItem('admin_month');
      if (monthLabel) {
        monthLabel.textContent = savedMonth
          ? (savedMonth.split('-')[1] || '') + '/' + (savedMonth.split('-')[0] || '')
          : currentMonthLabel;
      }
      ddMoreMenu.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest('button[role="menuitem"]');
        if (!b) return;
        const val = b.getAttribute('data-value') || '';
        localStorage.setItem('admin_month', val);
        const [y, m] = val.split('-');
        if (monthLabel) monthLabel.textContent = (m || '') + '/' + (y || '');
        window.dispatchEvent(new CustomEvent('admin:filters', { detail: { month: val } }));
      });
    }
    const setup = (btnId: string, menuId: string): void => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      const box = btn?.closest('.dropdown');
      if (!btn || !menu || !box) return;
      const open = (): void => {
        menu.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
        box.classList.add('open');
      };
      const close = (): void => {
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
        box.classList.remove('open');
      };
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hasAttribute('hidden') ? open() : close();
      });
      document.addEventListener('click', (e) => {
        if (!box.contains(e.target as Node)) close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    };
    setup('ddUserBtn', 'ddUserMenu');
    setup('ddMoreBtn', 'ddMoreMenu');
  }

  private onDocumentClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const editBtn = target.closest('[data-edit]');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      this.openEditProductModal(editBtn.getAttribute('data-edit') || '');
      return;
    }
    const deleteBtn = target.closest('[data-delete]');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      this.handleDeleteProduct(deleteBtn.getAttribute('data-delete') || '');
      return;
    }
    const editOrderBtn = target.closest('[data-edit-order]');
    if (editOrderBtn) {
      e.preventDefault();
      e.stopPropagation();
      this.openOrderDetailModal(editOrderBtn.getAttribute('data-edit-order') || '');
      return;
    }
    if (
      target.closest('[data-close-modal]') ||
      (target.classList.contains('modal-overlay') && target.closest('#modal-edit-product'))
    ) {
      this.closeEditProductModal();
      return;
    }
    if (
      target.closest('[data-close-add-modal]') ||
      (target.classList.contains('modal-overlay') && target.closest('#modal-add-product'))
    ) {
      this.closeAddProductModal();
      return;
    }
    if (target.closest('[data-close-order]')) {
      this.closeOrderDetailModal();
      return;
    }
    if (target.classList.contains('modal-overlay') && target.closest('#modal-order-detail'))
      this.closeOrderDetailModal();
  }

  private onDocumentKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const editModal = document.getElementById('modal-edit-product');
    const addModal = document.getElementById('modal-add-product');
    const orderModal = document.getElementById('modal-order-detail');
    const deleteModal = document.getElementById('modal-delete-confirm');
    if (editModal?.style.display === 'flex') this.closeEditProductModal();
    if (addModal?.style.display === 'flex') this.closeAddProductModal();
    if (orderModal?.style.display === 'flex') orderModal.style.display = 'none';
    if (deleteModal?.classList.contains('show')) this.closeDeleteConfirmModal();
  }

  async reloadAdminTranslations(lang: string): Promise<void> {
    try {
      const response = await fetch(`/lang/${lang}.json`);
      if (!response.ok) throw new Error('Failed to load translations');
      const translations = await response.json();
      (window as any).adminTranslations = translations;
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (key && translations[key]) {
          if (el.tagName === 'TITLE') document.title = translations[key];
          else if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'button')
            (el as HTMLInputElement).placeholder = translations[key];
          else if (el.tagName === 'OPTION') el.textContent = translations[key];
          else el.textContent = translations[key];
        }
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key && translations[key]) (el as HTMLInputElement).placeholder = translations[key];
      });
      document.documentElement.lang = lang;
      this.renderOrdersTable(this.ORDERS_ALL);
    } catch (err) {
      console.error('Failed to reload admin translations', err);
    }
  }
}
