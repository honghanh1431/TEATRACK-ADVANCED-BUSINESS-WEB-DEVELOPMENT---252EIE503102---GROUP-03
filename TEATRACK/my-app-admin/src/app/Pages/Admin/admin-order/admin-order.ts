import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Order {
  id?: string;
  _id?: string;
  orderId?: string;
  status: string;
  date?: string;
  createdAt?: string;
  total?: number;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  paymentMethod?: string;
  deliveryAgency?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items?: { name?: string; image?: string; size?: string; quantity?: number; price?: number }[];
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-order.html',
  styleUrls: ['./admin-order.css']
})
export class AdminOrder implements OnInit, AfterViewInit, OnDestroy {
  private readonly $ = (s: string, r: Document = document) => r.querySelector(s);

  ORDERS_ALL: Order[] = [];
  filterState = { orderId: '', search: '' };
  currentTabStatus = '';
  showAlertOrder = false;
  alertMessageOrder = '';
  private escHandler = (e: KeyboardEvent) => this.onEscKey(e);
  private storageHandler = (e: StorageEvent) => this.onStorageOrders(e);

  private readonly API_BASE = 'http://localhost:3002';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    try {
      const authAdmin = localStorage.getItem('authAdmin');
      if (!authAdmin) {
        this.router.navigateByUrl('/login-admin');
        return;
      }
    } catch { }

    this.loadFromStorage();
    this.fetchOrders();
  }

  ngAfterViewInit(): void {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('authAdmin')) return;
    setTimeout(() => {
      try {
        if (!this.$('#ordersTableBody')) return; // Changed from #ordersBody to #ordersTableBody as per template
        this.initSuccessModal();
        this.initFilters();
        this.initTabs();
        this.initExportButton();
        this.initSaveOrderButton();
        this.initOrderDetailModal();
        this.initEventDelegation();
        document.addEventListener('keydown', this.escHandler);
        window.addEventListener('storage', this.storageHandler);
        /* Cập nhật số liệu stat và bảng ngay khi DOM đã render (ngOnInit gọi update khi DOM chưa có) */
        this.updateOrdersStats();
        this.applyFilters();
        this.cdr.detectChanges();
      } catch (err) {
        console.error('AdminOrder init error:', err);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.escHandler);
    window.removeEventListener('storage', this.storageHandler);
  }

  /** Sort đơn hàng theo ngày giảm dần (mới nhất trước). */
  private sortOrdersByDateDesc(): void {
    this.ORDERS_ALL.sort((a, b) => {
      const tA = new Date((a.date || a.createdAt) as string | number | undefined || 0).getTime();
      const tB = new Date((b.date || b.createdAt) as string | number | undefined || 0).getTime();
      return tB - tA;
    });
  }

  /** Tab khác (admin hoặc admin-order) sửa orders → cập nhật lại từ localStorage. */
  private onStorageOrders(e: StorageEvent): void {
    if (e.key !== 'orders' || e.newValue == null) return;
    try {
      this.ORDERS_ALL = JSON.parse(e.newValue) as Order[];
      this.normalizeOrdersStatusToEnglish();
      this.sortOrdersByDateDesc();
      this.updateOrdersStats();
      this.applyFilters();
      this.cdr.detectChanges();
    } catch (_) { }
  }

  private fmtMoney(n: number | string): string {
    return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';
  }

  private fmtDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem('orders');
      if (raw) {
        this.ORDERS_ALL = JSON.parse(raw) as Order[];
        this.normalizeOrdersStatusToEnglish();
        this.sortOrdersByDateDesc();
        this.updateOrdersStats();
        this.applyFilters();
      }
    } catch (err) {
      console.error('Failed to load from localStorage', err);
    }
  }

  /** Đồng nhất với admin: merge Database + localStorage + JSON, dedupe theo id, sort mới nhất trước */
  async fetchOrders(): Promise<void> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // 1. Fetch from Database
      this.http.get<{ orders: Order[] }>(`${this.API_BASE}/api/admin/orders`, { headers }).subscribe({
        next: (res) => {
          const fromDb = res.orders || [];

          // 2. Fetch from JSON
          this.http.get<Order[]>('/data/orders.json').subscribe({
            next: (fromJsonRaw) => {
              const fromJson = Array.isArray(fromJsonRaw) ? fromJsonRaw : [];

              // 3. Load from Storage
              let fromStorage: Order[] = [];
              try {
                const raw = localStorage.getItem('orders');
                if (raw) fromStorage = JSON.parse(raw) as Order[];
              } catch (_) { }

              const ids = new Set<string>();
              this.ORDERS_ALL = [];

              // Merge Sources: DB > Storage > JSON
              [...fromDb, ...fromStorage, ...fromJson].forEach((o) => {
                const id = String(o._id || o.id || o.orderId || '').trim();
                if (id && !ids.has(id)) {
                  ids.add(id);
                  if (o._id && !o.id) o.id = String(o._id);
                  this.ORDERS_ALL.push(o);
                }
              });

              this.sortOrdersByDateDesc();
              try {
                localStorage.setItem('orders', JSON.stringify(this.ORDERS_ALL));
              } catch (_) { }
              this.updateOrdersStats();
              this.applyFilters();
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Fetch json orders error', err);
              this.processAndRender(fromDb);
            }
          });
        },
        error: (err) => {
          console.error('Fetch DB orders error', err);
          this.fallbackFetch();
        }
      });
    } catch (err) {
      console.error('Global fetch orders error', err);
    }
  }

  private processAndRender(orders: Order[]): void {
    const ids = new Set<string>();
    this.ORDERS_ALL = [];
    orders.forEach(o => {
      const id = String(o._id || o.id || o.orderId || '').trim();
      if (id && !ids.has(id)) {
        ids.add(id);
        if (o._id && !o.id) o.id = String(o._id);
        this.ORDERS_ALL.push(o);
      }
    });
    this.sortOrdersByDateDesc();
    this.updateOrdersStats();
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private fallbackFetch(): void {
    this.http.get<Order[]>('/data/orders.json').subscribe({
      next: (data) => {
        const fromJson = Array.isArray(data) ? data : [];
        let fromStorage: Order[] = [];
        try {
          const raw = localStorage.getItem('orders');
          if (raw) fromStorage = JSON.parse(raw) as Order[];
        } catch (_) { }
        this.processAndRender([...fromStorage, ...fromJson]);
      },
      error: () => {
        if (!this.ORDERS_ALL.length) this.applyFilters();
      }
    });
  }

  showSuccess(message = 'CẬP NHẬT THÀNH CÔNG'): void {
    const modal = document.getElementById('modal-success');
    const messageEl = document.getElementById('success-message');
    if (!modal) return;
    if (messageEl) messageEl.textContent = message;
    (modal as HTMLElement).style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  }

  hideSuccess(): void {
    const modal = document.getElementById('modal-success');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
  }

  private initSuccessModal(): void {
    const btn = document.getElementById('btn-close-success');
    if (btn) btn.addEventListener('click', () => this.hideSuccess());
    document.querySelectorAll('[data-close-success]').forEach((el) => el.addEventListener('click', () => this.hideSuccess()));
  }

  private onEscKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    const successModal = document.getElementById('modal-success');
    if (successModal?.classList.contains('show')) {
      this.hideSuccess();
      return;
    }
    const orderModal = document.getElementById('modal-order-detail');
    if (orderModal && (orderModal as HTMLElement).style.display === 'flex') {
      this.closeOrderDetailModal();
    }
  }

  private updateOrdersStats(): void {
    const setStat = (id: string, val: number | string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val ?? 0);
    };
    const orders = this.ORDERS_ALL;
    const norm = (s: string) => (s || '').toLowerCase().trim();
    setStat('statAll', orders.length);
    setStat('statPending', orders.filter((o) => norm(o.status) === 'pending').length);
    setStat('statProcessing', orders.filter((o) => norm(o.status) === 'processing').length);
    setStat('statReady', orders.filter((o) => norm(o.status) === 'ready').length);
    setStat('statShipping', orders.filter((o) => norm(o.status) === 'shipping').length);
    setStat('statCompleted', orders.filter((o) => norm(o.status) === 'completed').length);
    setStat('statCancelled', orders.filter((o) => norm(o.status) === 'cancelled').length);
  }

  private normalize(str: string | null | undefined): string {
    if (str == null) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private normalizeOrdersStatusToEnglish(): void {
    const toEnglish: Record<string, string> = {
      pending: 'pending',
      processing: 'processing',
      ready: 'ready',
      shipping: 'shipping',
      completed: 'completed',
      cancelled: 'cancelled',
      'xác nhận đơn hàng': 'pending',
      'chuẩn bị đơn hàng': 'processing',
      'chờ lấy hàng': 'ready',
      'đang giao hàng': 'shipping',
      'giao thành công': 'completed',
      'đã hủy': 'cancelled',
    };
    this.ORDERS_ALL.forEach((o) => {
      const s = (o.status || '').toString().trim().toLowerCase();
      if (toEnglish[s] !== undefined) o.status = toEnglish[s];
      else if (s.includes('hủy') || s.includes('cancel')) o.status = 'cancelled';
      else if (s.includes('thành công') || s.includes('hoàn') || s.includes('complete')) o.status = 'completed';
      else if (s.includes('giao') && s.includes('đang')) o.status = 'shipping';
      else if (s.includes('lấy hàng') || s.includes('chờ lấy')) o.status = 'ready';
      else if (s.includes('chuẩn bị')) o.status = 'processing';
      else if (s.includes('xác nhận')) o.status = 'pending';
    });
  }

  private filterOrders(): Order[] {
    return this.ORDERS_ALL.filter((order) => {
      if (this.currentTabStatus && order.status !== this.currentTabStatus) return false;
      const orderIdNorm = this.normalize(order.id || order.orderId || '');
      const searchNorm = this.normalize(this.filterState.search);
      const orderIdFilter = this.normalize(this.filterState.orderId);
      if (orderIdFilter && !orderIdNorm.includes(orderIdFilter)) return false;
      if (searchNorm) {
        const name = this.normalize(order.customerName);
        const phone = this.normalize(order.customerPhone);
        const matchSearch =
          orderIdNorm.includes(searchNorm) || name.includes(searchNorm) || phone.includes(searchNorm);
        if (!matchSearch) return false;
      }
      return true;
    });
  }

  private applyFilters(): void {
    const filtered = this.filterOrders();
    this.renderOrdersTable();
    const totalEl = this.$('#totalOrders');
    if (totalEl) totalEl.textContent = String(filtered.length);
    const activeStatId =
      this.currentTabStatus === ''
        ? 'statAll'
        : 'stat' + this.currentTabStatus.charAt(0).toUpperCase() + this.currentTabStatus.slice(1);
    const activeStatEl = this.$('#' + activeStatId);
    if (activeStatEl) activeStatEl.textContent = String(filtered.length);
  }

  private initFilters(): void {
    const orderIdFilter = this.$('#filter-order-id') as HTMLInputElement | null;
    const searchInput = this.$('#search-order') as HTMLInputElement | null;
    const btnSearch = this.$('#btnSearch');

    const apply = () => {
      this.filterState.orderId = orderIdFilter?.value?.trim() ?? '';
      this.filterState.search = searchInput?.value?.trim() ?? '';
      this.applyFilters();
    };

    if (orderIdFilter) orderIdFilter.addEventListener('input', apply);
    if (searchInput) searchInput.addEventListener('input', apply);
    if (btnSearch) btnSearch.addEventListener('click', apply);
  }

  private initTabs(): void {
    const tabs = document.querySelectorAll('.stat-card');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const status = tab.getAttribute('data-status') ?? '';
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTabStatus = status;
        this.applyFilters();
      });
    });
  }

  /** Badge class + text giống admin (status-badge pending, Xác nhận đơn hàng, ...) */
  private getBadgeForStatus(status: string): { class: string; text: string } {
    const map: Record<string, { class: string; text: string }> = {
      pending: { class: 'status-badge pending', text: 'Xác nhận đơn hàng' },
      processing: { class: 'status-badge processing', text: 'Chuẩn bị đơn hàng' },
      ready: { class: 'status-badge ready', text: 'Chờ lấy hàng' },
      shipping: { class: 'status-badge shipping', text: 'Đang giao hàng' },
      completed: { class: 'status-badge completed', text: 'Giao thành công' },
      cancelled: { class: 'status-badge cancelled', text: 'Đã hủy' },
    };
    const key = (status || '').toLowerCase();
    return map[key] || map['pending'];
  }

  private renderOrdersTable(): void {
    const tbody = this.$('#ordersTableBody');
    if (!tbody) return;

    const filtered = this.filterOrders();
    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;padding:40px;color:#fffff;">Không có đơn hàng nào</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((order, index) => {
        const stt = index + 1;
        const orderId = order.id || order.orderId || '-';
        const customerName = order.customerName || 'Khách hàng';
        const dateStr = this.fmtDate(order.date || order.createdAt);
        const total = this.fmtMoney(order.total ?? 0);
        const paymentMethod = order.paymentMethod || 'Tiền mặt';
        const badge = this.getBadgeForStatus(order.status);

        return `
          <tr>
            <td>${stt}</td>
            <td>#${orderId}</td>
            <td>${customerName}</td>
            <td>${dateStr}</td>
            <td><span class="${badge.class}">${badge.text}</span></td>
            <td>${total}</td>
            <td>${paymentMethod}</td>
            <td>${order.deliveryAgency || 'Chưa xác định'}</td>
            <td><span class="btns"><button type="button" class="btn" data-edit-order="${orderId}" title="Chi tiết"><img src="assets/icons/edit2.png" alt="Chỉnh sửa" aria-hidden="true"></button></span></td>
          </tr>
        `;
      })
      .join('');
  }

  /** Giống admin: tạo dòng chi tiết cho từng item (size, ngọt, đá, số lượng, topping). */
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
    if (lines.length === 0) {
      lines.push(`Size: ${item.size || 'M'} • SL: ${qty}`);
    }
    return lines;
  }

  openOrderDetailModal(orderId: string): void {
    document.querySelectorAll('.modal').forEach((m) => {
      if ((m as HTMLElement).id !== 'modal-order-detail') {
        (m as HTMLElement).style.display = 'none';
      }
    });

    const modal = document.getElementById('modal-order-detail');
    if (!modal) return;

    const order = this.ORDERS_ALL.find((o) => (o.id || o.orderId) == orderId);
    if (!order) return;

    const set = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set('order-id', order.id || order.orderId || '');
    const dateTime = this.fmtDate(order.date || order.createdAt).split(' ');
    set('order-date', dateTime[0] || '');
    set('order-time', dateTime[1] || '');
    set('customer-name', order.customerName || (order as any).customer?.name || '');
    set('customer-phone', order.customerPhone ?? (order as any).customer?.phone ?? '');
    set('customer-address', order.customerAddress ?? (order as any).customer?.address ?? '');

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
      itemsContainer.innerHTML = (order.items || [])
        .map((item: any) => {
          let imgUrl = item.image || item.img || 'assets/images/products/default.jpg';
          if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:') && !imgUrl.startsWith('/')) {
            imgUrl = '/' + imgUrl;
          }
          const rawName = item.name || item.productName || 'Sản phẩm';
          const name = String(rawName).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const lines = this.getOrderItemDetailLines(item);
          const qty = item.qty ?? item.quantity ?? 1;
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
    this.cdr.detectChanges();

    set('subtotal', this.fmtMoney(order.subtotal || order.total || 0));
    set('shipping-fee', this.fmtMoney((order as any).shippingFee || 0));
    set('discount', this.fmtMoney((order as any).discount || 0));
    set('total-amount', this.fmtMoney(order.total || (order as any).totalAmount || 0));

    (modal as HTMLElement).style.display = 'flex';
    modal.classList.add('show');
  }

  closeOrderDetailModal(): void {
    const modal = document.getElementById('modal-order-detail');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
  }

  saveOrderChanges(): void {
    const statusSelect = document.getElementById('order-status-dropdown') as HTMLSelectElement | null;
    if (!statusSelect) return;

    const orderId = statusSelect.dataset['orderId'] ?? '';
    const originalStatus = statusSelect.dataset['originalStatus'] ?? '';
    const newStatus = statusSelect.value;

    if (originalStatus === newStatus) {
      this.showSuccess('KHÔNG CÓ THAY ĐỔI');
      this.closeOrderDetailModal();
      return;
    }

    const order = this.ORDERS_ALL.find((o) => (o.id || o.orderId) == orderId);
    if (!order) return;

    // Nếu là đơn hàng DB
    if (order._id) {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      this.http.put(`${this.API_BASE}/api/admin/orders/${order._id}/status`, { status: newStatus }, { headers }).subscribe({
        next: () => {
          order.status = newStatus;
          this.sortOrdersByDateDesc();
          localStorage.setItem('orders', JSON.stringify(this.ORDERS_ALL));
          this.updateOrdersStats();
          this.applyFilters();
          this.showSuccess('CẬP NHẬT TRẠNG THÁI THÀNH CÔNG');
          this.closeOrderDetailModal();
        },
        error: (err) => {
          console.error('Update status DB error:', err);
          this.showAlertModal('Lỗi cập nhật database!');
        }
      });
    } else {
      order.status = newStatus;
      this.sortOrdersByDateDesc();
      try {
        localStorage.setItem('orders', JSON.stringify(this.ORDERS_ALL));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
      this.updateOrdersStats();
      this.applyFilters();
      this.showSuccess('CẬP NHẬT TRẠNG THÁI THÀNH CÔNG (Local)');
      this.closeOrderDetailModal();
    }
  }

  async exportOrders(): Promise<void> {
    if (!this.ORDERS_ALL?.length) {
      this.showAlertModal('Không có đơn hàng để xuất!');
      return;
    }
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      return;
    }
    const workbook = new ExcelJSLib.Workbook();
    const sheet = workbook.addWorksheet('Danh sách đơn hàng', { views: [{ state: 'frozen', ySplit: 1 }] });
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };
    sheet.columns = [
      { header: 'Mã đơn hàng', key: 'code', width: 18 },
      { header: 'Khách hàng', key: 'customer', width: 22 },
      { header: 'Số điện thoại', key: 'phone', width: 14 },
      { header: 'Địa chỉ', key: 'address', width: 28 },
      { header: 'Ngày đặt', key: 'date', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Tổng tiền (VNĐ)', key: 'total', width: 16 },
    ];
    sheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    for (const o of this.ORDERS_ALL) {
      sheet.addRow({
        code: o.id || o.orderId || '',
        customer: o.customerName || '',
        phone: o.customerPhone || '',
        address: (o.customerAddress || '').replace(/\n/g, ' '),
        date: this.fmtDate(o.date || o.createdAt),
        status: o.status || '',
        total: (o.total ?? 0).toLocaleString('vi-VN'),
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    saveAsLib(new Blob([buffer]), `Don_hang_${today}.xlsx`);
    this.showAlertModal('Đã xuất danh sách đơn hàng ra file Excel thành công.');
  }

  showAlertModal(message: string): void {
    this.alertMessageOrder = message;
    this.showAlertOrder = true;
    this.cdr.detectChanges();
  }

  closeAlertModal(): void {
    this.showAlertOrder = false;
    this.cdr.detectChanges();
  }

  closeAlertOnOverlay(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) this.closeAlertModal();
  }

  private initExportButton(): void {
    const btn = document.getElementById('btnExportOrders');
    if (btn) btn.addEventListener('click', () => this.exportOrders());
  }

  private initSaveOrderButton(): void {
    const btn = document.getElementById('btn-save-order');
    if (btn) btn.addEventListener('click', () => this.saveOrderChanges());
  }

  private initOrderDetailModal(): void {
    const statusSelect = document.getElementById('order-status-dropdown') as HTMLSelectElement | null;
    if (!statusSelect) return;
    statusSelect.addEventListener('change', () => {
      statusSelect.dataset['status'] = statusSelect.value;
    });
  }

  private initEventDelegation(): void {
    document.addEventListener('click', (e) => {
      const editBtn = (e.target as Element).closest('[data-edit-order]');
      if (editBtn) {
        e.preventDefault();
        const orderId = (editBtn as HTMLElement).dataset['editOrder'] ?? '';
        this.openOrderDetailModal(orderId);
        return;
      }

      const closeOrder = (e.target as Element).closest('[data-close-order]');
      const isOverlay = (e.target as Element).classList.contains('modal-overlay') && (e.target as Element).closest('#modal-order-detail');
      if (closeOrder || isOverlay) {
        this.closeOrderDetailModal();
      }
    });
  }
}
