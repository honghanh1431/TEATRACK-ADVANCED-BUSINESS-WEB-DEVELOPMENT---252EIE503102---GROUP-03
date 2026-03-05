import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface CartItemInput {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  size?: string;
  sweetness?: string;
  ice?: string;
  toppings?: string[];
  note?: string;
  options?: string[];
  qty: number;
}

const STORAGE_KEY = 'cart_items';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiUrl = 'http://localhost:3002/api/cart';

  constructor(private http: HttpClient) { }

  /** Emits toast data: pre + name (in đậm) + post */
  readonly toastMessage$ = new Subject<{ pre: string; name: string; post: string }>();

  addItem(item: CartItemInput): void {
    const qty = Math.max(1, Math.min(99, Number(item.qty) || 1));
    const normalized = {
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      price: Number(item.price) || 0,
      image: String(item.image ?? ''),
      size: item.size,
      sweetness: item.sweetness,
      ice: item.ice,
      toppings: Array.isArray(item.toppings) ? [...item.toppings] : undefined,
      note: item.note,
      options: item.options,
      qty,
    };
    let items: any[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) items = parsed;
      }
    } catch (_) { }
    const sig = this.itemSignature(normalized);
    const existingIdx = items.findIndex((it) => this.itemSignature(it) === sig);
    if (existingIdx >= 0) {
      items[existingIdx].qty = Math.min(99, (items[existingIdx].qty || 1) + qty);
    } else {
      items.push(normalized);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated'));
    this.toastMessage$.next({ pre: 'Thêm ', name: normalized.name, post: ' vào giỏ hàng' });
  }

  /** Signature để so sánh gộp món: cùng sản phẩm + cùng chi tiết (size, ngọt, đá, topping, note) */
  private itemSignature(it: { id?: string; name?: string; size?: string; sweetness?: string; ice?: string; toppings?: string[]; note?: string }): string {
    const id = String(it.id ?? '').trim();
    const name = String(it.name ?? '').trim();
    const size = String(it.size ?? '').trim();
    const sweetness = String(it.sweetness ?? '').trim();
    const ice = String(it.ice ?? '').trim();
    const note = String(it.note ?? '').trim();
    const top = Array.isArray(it.toppings) ? [...it.toppings].sort().join('|') : '';
    return `${id}\t${name}\t${size}\t${sweetness}\t${ice}\t${note}\t${top}`;
  }

  /**
   * Gộp các món trùng đặc điểm (cùng id, size, sweetness, ice, toppings, note) thành một dòng và cộng quantity.
   * Gọi khi load giỏ để đảm bảo hiển thị đã gộp (kể cả dữ liệu cũ hoặc thêm từ nhiều nguồn).
   */
  mergeDuplicateItems(items: any[]): any[] {
    if (!Array.isArray(items) || items.length === 0) return items;
    const map = new Map<string, any>();
    for (const it of items) {
      const sig = this.itemSignature(it);
      const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
      if (map.has(sig)) {
        const existing = map.get(sig)!;
        existing.qty = Math.min(99, (existing.qty || 1) + qty);
      } else {
        map.set(sig, { ...it, qty });
      }
    }
    return Array.from(map.values());
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token || ''}` });
  }

  /** Lấy giỏ hàng từ server */
  fetchCart(): Observable<{ items: any[] }> {
    return this.http.get<{ items: any[] }>(this.apiUrl, { headers: this.getHeaders() });
  }

  /** Đồng bộ giỏ hàng lên server */
  syncCart(items: any[]): Observable<any> {
    return this.http.post(this.apiUrl, { items }, { headers: this.getHeaders() });
  }

  /** Xóa giỏ hàng trên server (sau khi checkout) */
  clearCart(): Observable<any> {
    return this.http.delete(this.apiUrl, { headers: this.getHeaders() });
  }
}
