import { Injectable } from '@angular/core';

/**
 * Lưu số lượt đánh giá theo productId (cập nhật khi load/submit review).
 * Dùng cho homepage, menu, product để hiển thị "X lượt đánh giá" đồng bộ.
 */
@Injectable({ providedIn: 'root' })
export class ReviewCountService {
  private counts = new Map<string, number>();

  setCount(productId: string, count: number): void {
    this.counts.set(String(productId), count);
  }

  getCount(productId: string | number | undefined): number | undefined {
    if (productId == null) return undefined;
    const key = String(productId);
    return this.counts.has(key) ? this.counts.get(key) : undefined;
  }
}
