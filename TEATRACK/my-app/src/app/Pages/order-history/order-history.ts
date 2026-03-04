import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface Product {
  name: string;
  meta: string;
  price: string;
  emoji: string;
  colorClass: string;
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

export class OrderHistory implements OnInit {

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  activeTab = 'all';
  currentPage = 1;
  /** Số trang (giống blog-list) */
  totalPages = 3;
  pageNumbers: number[] = [1, 2, 3];

  timelineSteps: TimelineStep[] = [
    { icon: '🕐', label: 'Xác nhận đơn hàng' },
    { icon: '📦', label: 'Chuẩn bị đơn hàng' },
    { icon: '🏪', label: 'Chờ lấy hàng' },
    { icon: '🚚', label: 'Đang giao hàng' },
    { icon: '⭐', label: 'Giao thành công' },
  ];

  tabs: Tab[] = [
    { status: 'all',       icon: '🛒', label: 'Tất cả',        count: 5 },
    { status: 'pending',   icon: '🕐', label: 'Xác nhận đơn hàng',  count: 1 },
    { status: 'processing', icon: '📦', label: 'Chuẩn bị đơn hàng',      count: 1 },
    { status: 'ready',    icon: '🏪', label: 'Chờ lấy hàng',  count: 1 },
    { status: 'shipping',  icon: '🚚', label: 'Đang giao hàng',      count: 1 },
    { status: 'completed', icon: '⭐', label: 'Giao thành công',     count: 1 },
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
        { name: 'Giày Thể Thao Nike Air Max 270', meta: 'Size: 42 · Màu: Trắng · x1', price: '1.850.000₫', emoji: '👟', colorClass: 'c1' },
        { name: 'Áo Thun Polo Cotton Premium',    meta: 'Size: L · Màu: Xanh Navy · x2', price: '480.000₫', emoji: '👕', colorClass: 'c2' },
      ],
    },
    {
      id: '#DH-20240289',
      date: '28/02/2024',
      status: 'processing',
      statusLabel: 'Chuẩn bị đơn hàng',
      activeStep: 1,
      progressPercent: 25,
      total: '2.290.000₫',
      products: [
        { name: 'Bàn Phím Cơ Keychron K2 V2', meta: 'Switch: Brown · Layout: TKL · x1', price: '2.290.000₫', emoji: '💻', colorClass: 'c3' },
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
        { name: 'Balo Laptop Thời Trang Unisex 15"', meta: 'Màu: Đen · x1',  price: '650.000₫', emoji: '🎒', colorClass: 'c4' },
        { name: 'Kem Chống Nắng SPF50 Anessa',       meta: '60ml · x3',       price: '360.000₫', emoji: '🧴', colorClass: 'c2' },
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
        { name: 'Ốp Lưng iPhone 15 Pro Magsafe', meta: 'Màu: Trong suốt · x2', price: '290.000₫', emoji: '📱', colorClass: 'c1' },
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
        { name: 'Ghế Gaming Ergonomic E-Dra EGC203', meta: 'Màu: Đen đỏ · x1', price: '4.500.000₫', emoji: '🪑', colorClass: 'c3' },
      ],
    },
  ];

  filteredOrders: Order[] = [];

  ngOnInit(): void {
    this.filteredOrders = [...this.orders];
  }

  filterOrders(status: string): void {
    this.activeTab = status;
    this.currentPage = 1;
    this.filteredOrders = status === 'all'
      ? [...this.orders]
      : this.orders.filter(o => o.status === status);
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
    console.log('View detail:', order.id);
    // TODO: navigate to /orders/:id
  }

  cancelOrder(order: Order): void {
    console.log('Cancel order:', order.id);
    // TODO: hiển thị confirm dialog rồi gọi API huỷ
  }

  trackOrder(order: Order): void {
    console.log('Track order:', order.id);
    // TODO: mở trang theo dõi vận chuyển
  }

  reorder(order: Order): void {
    console.log('Reorder:', order.id);
    // TODO: thêm lại sản phẩm vào giỏ hàng
  }

  reviewOrder(order: Order): void {
    console.log('Review order:', order.id);
    // TODO: mở modal đánh giá
  }
}
