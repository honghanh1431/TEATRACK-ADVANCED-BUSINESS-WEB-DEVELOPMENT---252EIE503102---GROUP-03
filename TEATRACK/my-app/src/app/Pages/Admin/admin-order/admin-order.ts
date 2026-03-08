import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Order {
  id?: string;
  orderId?: string;
  status: string;
  date?: string;
  createdAt?: string;
  total?: number;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  paymentMethod?: string;
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
  private escHandler = (e: KeyboardEvent) => this.onEscKey(e);

  constructor(private router: Router) {}

  ngOnInit(): void {
    try {
      const authAdmin = localStorage.getItem('authAdmin');
      if (!authAdmin) {
        this.router.navigateByUrl('/login-admin');
        return;
      }
    } catch {}

    this.loadFromStorage();
    this.fetchOrders();
  }

  ngAfterViewInit(): void {
    this.initSuccessModal();
    this.initFilters();
    this.initTabs();
    this.initExportButton();
    this.initSaveOrderButton();
    this.initOrderDetailModal();
    this.initEventDelegation();
    document.addEventListener('keydown', this.escHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.escHandler);
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
        this.ORDERS_ALL = JSON.parse(raw);
        this.updateOrdersStats();
        this.applyFilters();
      }
    } catch (err) {
      console.error('Failed to load from localStorage', err);
    }
  }

  private async fetchOrders(): Promise<void> {
    try {
      const res = await fetch('/data/orders.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load orders');
      this.ORDERS_ALL = await res.json();
      this.updateOrdersStats();
      this.applyFilters();
    } catch (err) {
      console.error('Fetch orders error', err);
      if (!this.ORDERS_ALL.length) this.applyFilters();
    }
  }

  showSuccess(message = 'CẬP NHẬT THÀNH CÔNG'): void {
    const modal = document.getElementById('modal-success');
    const messageEl = document.getElementById('success-message');
    if (!modal) return;
    if (messageEl) messageEl.textContent = message;
    (modal as HTMLElement).style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    setTimeout(() => this.hideSuccess(), 2000);
  }

  hideSuccess(): void {
    const modal = document.getElementById('modal-success');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
  }

  private initSuccessModal(): void {
    const btn = document.getElementById('btn-close-success');
    const modal = document.getElementById('modal-success');
    if (btn) btn.addEventListener('click', () => this.hideSuccess());
    const overlay = modal?.querySelector('.modal-overlay');
    if (overlay) overlay.addEventListener('click', () => this.hideSuccess());
  }

  private onEscKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      const orderModal = document.getElementById('modal-order-detail');
      if (orderModal && (orderModal as HTMLElement).style.display === 'flex') {
        this.closeOrderDetailModal();
      }
    }
  }

  private updateOrdersStats(): void {
    const setText = (id: string, val: number | string) => {
      const el = this.$(id);
      if (el) el.textContent = String(val ?? 0);
    };
    const orders = this.ORDERS_ALL;
    setText('statAll', orders.length);
    setText('statPending', orders.filter((o) => o.status === 'pending').length);
    setText('statProcessing', orders.filter((o) => o.status === 'processing').length);
    setText('statReady', orders.filter((o) => o.status === 'ready').length);
    setText('statShipping', orders.filter((o) => o.status === 'shipping').length);
    setText('statCompleted', orders.filter((o) => o.status === 'completed').length);
    setText('statCancelled', orders.filter((o) => o.status === 'cancelled').length);
  }

  private normalize(str: string | null | undefined): string {
    if (str == null) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
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
          <td colspan="8" style="text-align:center;padding:40px;color:#fffff;">Không có đơn hàng nào</td>
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
            <td><span class="btns"><button type="button" class="btn" data-edit-order="${orderId}" title="Chi tiết"><img src="assets/icons/edit2.png" alt="Chỉnh sửa" aria-hidden="true"></button></span></td>
          </tr>
        `;
      })
      .join('');
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

    const setText = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('order-id', order.id || order.orderId || '-');

    const dateTime = this.fmtDate(order.date || order.createdAt).split(' ');
    setText('order-date', dateTime[0] || '-');
    setText('order-time', dateTime[1] || '-');

    setText('customer-name', order.customerName || '-');
    setText('customer-phone', order.customerPhone || '-');
    setText('customer-address', order.customerAddress || '-');

    const statusLabels: Record<string, string> = {
      pending: 'Xác nhận đơn hàng',
      processing: 'Chuẩn bị đơn hàng',
      ready: 'Chờ lấy hàng',
      shipping: 'Đang giao hàng',
      completed: 'Giao thành công',
      cancelled: 'Đã hủy',
    };
    const statusBadgeClass: Record<string, string> = {
      pending: 'status-badge status-pending',
      processing: 'status-badge status-processing',
      ready: 'status-badge status-ready',
      shipping: 'status-badge status-shipping',
      completed: 'status-badge status-completed',
      cancelled: 'status-badge status-cancelled',
    };
    const statusSelect = document.getElementById('order-status-dropdown') as HTMLSelectElement | null;
    const statusTextEl = document.getElementById('order-status-text');
    if (statusSelect && order.status) {
      const st = order.status.toLowerCase();
      statusSelect.value = st;
      statusSelect.dataset['originalStatus'] = order.status;
      statusSelect.dataset['orderId'] = order.id || order.orderId || '';
      statusSelect.dataset['status'] = st;
      if (statusTextEl) {
        statusTextEl.textContent = statusLabels[st] || order.status;
        statusTextEl.className = 'info-value status-badge ' + (statusBadgeClass[st] || 'status-badge');
      }
    }

    const itemsContainer = document.getElementById('order-items');
    if (itemsContainer && order.items) {
      itemsContainer.innerHTML = (order.items || [])
        .map(
          (item) => `
        <div class="order-item">
          <img src="${item.image || 'assets/images/products/default.jpg'}" alt="${item.name || ''}" class="item-image">
          <div class="item-details">
            <h4 class="item-name">${item.name || '-'}</h4>
            <p class="item-specs">Size: ${item.size || 'M'} • SL: ${item.quantity || 1}</p>
          </div>
          <div class="item-price">${this.fmtMoney((item.price || 0) * (item.quantity || 1))}</div>
        </div>
      `
        )
        .join('');
    }

    setText('subtotal', this.fmtMoney(order.subtotal ?? order.total ?? 0));
    setText('shipping-fee', this.fmtMoney(order.shippingFee ?? 0));
    setText('discount', this.fmtMoney(order.discount ?? 0));
    setText('total-amount', this.fmtMoney(order.total ?? 0));

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

    const idx = this.ORDERS_ALL.findIndex((o) => (o.id || o.orderId) == orderId);
    if (idx !== -1) {
      this.ORDERS_ALL[idx].status = newStatus;
      try {
        localStorage.setItem('orders', JSON.stringify(this.ORDERS_ALL));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
      this.updateOrdersStats();
      this.applyFilters();
      this.showSuccess('CẬP NHẬT TRẠNG THÁI THÀNH CÔNG');
      this.closeOrderDetailModal();
    }
  }

  exportOrders(): void {
    if (!this.ORDERS_ALL?.length) {
      alert('Không có đơn hàng để xuất!');
      return;
    }

    const header = 'Mã đơn hàng,Khách hàng,Số điện thoại,Địa chỉ,Ngày đặt,Trạng thái,Tổng tiền\n';
    const rows = this.ORDERS_ALL.map((o) => {
      const id = o.id || o.orderId || '';
      const name = (o.customerName || '').replace(/,/g, ' ');
      const phone = o.customerPhone || '';
      const addr = (o.customerAddress || '').replace(/,/g, ' ');
      const date = this.fmtDate(o.date || o.createdAt);
      const status = o.status || '';
      const total = o.total ?? 0;
      return `${id},${name},${phone},${addr},${date},${status},${total}`;
    }).join('\n');

    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.showSuccess('XUẤT DANH SÁCH THÀNH CÔNG');
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
    const statusTextEl = document.getElementById('order-status-text');
    if (!statusSelect || !statusTextEl) return;
    const statusLabels: Record<string, string> = {
      pending: 'Xác nhận đơn hàng',
      processing: 'Chuẩn bị đơn hàng',
      ready: 'Chờ lấy hàng',
      shipping: 'Đang giao hàng',
      completed: 'Giao thành công',
      cancelled: 'Đã hủy',
    };
    const statusBadgeClass: Record<string, string> = {
      pending: 'status-badge status-pending',
      processing: 'status-badge status-processing',
      ready: 'status-badge status-ready',
      shipping: 'status-badge status-shipping',
      completed: 'status-badge status-completed',
      cancelled: 'status-badge status-cancelled',
    };
    statusSelect.addEventListener('change', () => {
      const v = statusSelect.value;
      statusSelect.dataset['status'] = v;
      statusTextEl.textContent = statusLabels[v] || v;
      statusTextEl.className = 'info-value status-badge ' + (statusBadgeClass[v] || 'status-badge');
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
