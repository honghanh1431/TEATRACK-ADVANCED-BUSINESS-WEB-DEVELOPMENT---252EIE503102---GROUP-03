import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

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
    } catch (_) {}
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

  /** Signature để so sánh gộp món: cùng sản phẩm + cùng chi tiết (size, ngọt, đá, topping) */
  private itemSignature(it: { id?: string; name?: string; size?: string; sweetness?: string; ice?: string; toppings?: string[] }): string {
    const top = Array.isArray(it.toppings) ? [...it.toppings].sort().join('|') : '';
    return `${it.id ?? ''}\t${it.name ?? ''}\t${it.size ?? ''}\t${it.sweetness ?? ''}\t${it.ice ?? ''}\t${top}`;
  }
}
