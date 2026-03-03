import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-order.html',
  styleUrls: ['./admin-order.css']
})
export class AdminOrder implements OnInit {
  // Dữ liệu thống kê
  stats = {
    total: 474,
    pending: 48,
    shipping: 113,
    delivered: 316
  };

  // Dữ liệu đơn hàng
  orders = [
    { stt: 1, maDonHang: 'HTNGTD273', thoiGian: '07:28 am 20/10/2025', tinhTrang: 'Đã giao hàng', thanhToan: 'Tồn mật' },
    { stt: 2, maDonHang: 'HTNGTD274', thoiGian: '08:09 am 21/10/2025', tinhTrang: 'Chờ xác nhận', thanhToan: 'Momo' },
    { stt: 3, maDonHang: 'HTNGTD275', thoiGian: '03:08 pm 21/10/2025', tinhTrang: 'Chờ xác nhận', thanhToan: 'Zalo pay' },
    { stt: 4, maDonHang: 'HTNGTD276', thoiGian: '03:56 pm 21/10/2025', tinhTrang: 'Đã giao hàng', thanhToan: 'Tồn mật' },
    { stt: 5, maDonHang: 'HTNGTD277', thoiGian: '09:45 pm 21/10/2025', tinhTrang: 'Đã giao hàng', thanhToan: 'Tồn mật' },
    { stt: 6, maDonHang: 'HTNGTD278', thoiGian: '02:22 pm 22/10/2025', tinhTrang: 'Đã giao hàng', thanhToan: 'Vì điện tử' },
    { stt: 7, maDonHang: 'HTNGTD279', thoiGian: '10:42 pm 22/10/2025', tinhTrang: 'Đã giao hàng', thanhToan: 'Momo' },
    { stt: 8, maDonHang: 'HTNGTD280', thoiGian: '11:11 am 23/10/2025', tinhTrang: 'Chờ xác nhận', thanhToan: 'Zalo pay' },
    { stt: 9, maDonHang: 'HTNGTD281', thoiGian: '08:15 pm 23/10/2025', tinhTrang: 'Đang giao hàng', thanhToan: 'Tiền mặt' }
  ];

  constructor() { }

  ngOnInit(): void {
    // Có thể gọi service ở đây nếu cần
  }

  // Helper để lấy class CSS cho badge trạng thái
  getStatusClass(status: string): string {
    switch (status) {
      case 'Đã giao hàng': return 'delivered';
      case 'Chờ xác nhận': return 'pending';
      case 'Đang giao hàng': return 'shipping';
      default: return '';
    }
  }
}