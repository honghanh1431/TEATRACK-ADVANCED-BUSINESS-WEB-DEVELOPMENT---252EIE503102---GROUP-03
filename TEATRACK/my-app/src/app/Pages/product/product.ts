import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ROUTE_TITLES } from '../../route-titles';
import { ProductStateService } from '../../product-state.service';

declare const window: Window & {
  NGCart?: {
    addItem: (item: {
      id: string;
      name: string;
      price: number;
      image?: string;
      size?: string;
      qty?: number;
    }) => void;
  };
};

export interface ProductItem {
  id?: string;
  name?: string;
  price?: number;
  priceL?: number;
  image?: string;
  category?: string;
  description?: string;
  detail?: string;
  rating?: number;
  reviews?: number;
  /** Bảo quản (từ JSON, fallback: 1-2 ngày ở ngăn mát tủ lạnh) */
  storage?: string;
  /** Trọng lượng (fallback: 700ml (size M) / 1000ml (size L)) */
  weight?: string;
  /** Xuất xứ (fallback: Việt Nam) */
  origin?: string;
  /** Topping nên dùng kèm (fallback: Thạch dừa nguyên vị, hạt nổ củ năng) */
  topping?: string;
  /** Ghi chú sản phẩm (fallback: Chi tiết bổ sung...) */
  note?: string;
}

@Component({
  selector: 'app-product',
  standalone: false,
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class Product implements OnInit, OnDestroy {
  product: ProductItem | null = null;
  relatedProducts: ProductItem[] = [];
  allProducts: ProductItem[] = [];
  activeTab: 'desc' | 'review' | 'commit' = 'desc';
  selectedSize: 'M' | 'L' = 'M';
  qty = 1;
  mainImageIndex = 0;
  loadError = false;
  noteOpen = false;
  private subs: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private titleService: Title,
    private cdr: ChangeDetectorRef,
    private productState: ProductStateService,
  ) {}

  ngOnInit(): void {
    const snapshot = this.route.snapshot;
    const sub = combineLatest([
      this.route.paramMap.pipe(startWith(snapshot.paramMap)),
      this.route.queryParamMap.pipe(startWith(snapshot.queryParamMap)),
    ]).pipe(
      map(([paramMap, queryParamMap]) => ({
        pid: paramMap.get('id') ?? queryParamMap.get('pid'),
        name: paramMap.get('name') ?? queryParamMap.get('name'),
      })),
    ).subscribe(({ pid, name }) => this.loadProductWithParams(pid, name));
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s?.unsubscribe());
  }

  private loadProductWithParams(pid: string | null, name: string | null): void {
    this.loadError = false;
    const pidStr = pid != null ? String(pid).trim() : null;
    const nameStr = name != null ? String(name).trim() : null;
    const stateProduct = this.productState.getAndClearNextProduct();
    const hasState = stateProduct && (pidStr === String(stateProduct.id).trim() || (nameStr && String(stateProduct.name).toLowerCase() === nameStr.toLowerCase()));
    if (hasState && stateProduct) {
      this.product = stateProduct;
      this.titleService.setTitle(`${stateProduct.name || 'Sản phẩm'} | ${ROUTE_TITLES['/product']}`);
      this.cdr.detectChanges();
    } else {
      this.product = null;
      this.cdr.detectChanges();
    }
    this.http.get<ProductItem[]>('/data/products.json').subscribe({
      next: (data) => {
        this.allProducts = data;
        let found: ProductItem | null = null;
        if (pidStr) {
          found = data.find((p) => String(p.id).trim() === pidStr) || null;
        }
        if (!found && nameStr) {
          const want = nameStr.toLowerCase();
          const normalized = (s: string | undefined) => (s || '').trim().toLowerCase();
          found = data.find((p) => normalized(p.name) === want) || null;
        }
        if (!found) found = data[0] || null;
        this.product = found;
        if (found) {
          this.titleService.setTitle(`${found.name || 'Sản phẩm'} | ${ROUTE_TITLES['/product']}`);
        }
        this.pickRelated();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = true;
        this.cdr.detectChanges();
      },
    });
  }

  private pickRelated(): void {
    if (!this.allProducts.length || !this.product) {
      this.relatedProducts = [];
      return;
    }
    const currentCategory = (this.product.category || '').trim().toLowerCase();
    const sameCategory = this.allProducts.filter(
      (p) => p.id !== this.product?.id && (p.category || '').trim().toLowerCase() === currentCategory
    );
    const other = this.allProducts.filter(
      (p) => p.id !== this.product?.id && (p.category || '').trim().toLowerCase() !== currentCategory
    );
    const count = 4;
    const shuffledSame = sameCategory.slice().sort(() => Math.random() - 0.5);
    const shuffledOther = other.slice().sort(() => Math.random() - 0.5);
    this.relatedProducts = [...shuffledSame, ...shuffledOther].slice(0, count);
  }

  formatVND(n: number | string | undefined): string {
    const num = Number(n);
    if (Number.isNaN(num)) return '0';
    try {
      return num.toLocaleString('vi-VN');
    } catch {
      return String(n);
    }
  }

  getProductImg(p: ProductItem): string {
    const raw = (p?.image || '').trim();
    if (!raw) return 'assets/icons/menu.png';
    if (raw.startsWith('http') || raw.startsWith('/')) return raw;
    if (raw.startsWith('assets/')) return raw;
    return 'assets/images/products/' + raw.replace(/^assets\/images\/products\//, '');
  }

  getPriceM(p: ProductItem): number {
    return Number(p?.price) || 0;
  }
  getPriceL(p: ProductItem): number {
    const l = Number((p as any)?.priceL);
    return l > 0 ? l : this.getPriceM(p) + 3000;
  }
  getVipPriceM(p: ProductItem): number {
    const v = Number((p as any)?.vipPriceM);
    return v > 0 ? v : Math.max(0, this.getPriceM(p) - 3000);
  }
  getVipPriceL(p: ProductItem): number {
    const v = Number((p as any)?.vipPriceL);
    return v > 0 ? v : Math.max(0, this.getPriceL(p) - 3000);
  }

  get productImage(): string {
    if (!this.product) return '';
    return this.getProductImg(this.product);
  }

  get ratingPct(): number {
    const r = Number(this.product?.rating) || 5;
    return Math.max(0, Math.min(100, (r / 5) * 100));
  }

  setMainImage(i: number): void {
    this.mainImageIndex = i;
  }

  selectSize(size: 'M' | 'L'): void {
    this.selectedSize = size;
  }

  changeQty(delta: number): void {
    this.qty = Math.max(1, Math.min(99, this.qty + delta));
  }

  addToCart(): void {
    if (!this.product || !window.NGCart) return;
    const price = this.selectedSize === 'L' ? this.getPriceL(this.product) : this.getPriceM(this.product);
    window.NGCart.addItem({
      id: String(this.product.id || ''),
      name: String(this.product.name || ''),
      price,
      image: this.product.image || '',
      size: this.selectedSize,
      qty: this.qty,
    });
    window.dispatchEvent(new CustomEvent('cart:updated'));
    alert('Đã thêm sản phẩm vào giỏ hàng!');
  }

  buyNow(): void {
    this.addToCart();
    this.router.navigate(['/cart']);
  }

  goToProduct(p: ProductItem): void {
    const id = p.id != null ? String(p.id) : '';
    const name = p.name != null ? String(p.name) : '';
    this.productState.setNextProduct(p);
    this.router.navigate(['/menu/product', id, name]);
  }

  setTab(tab: 'desc' | 'review' | 'commit'): void {
    this.activeTab = tab;
  }

  scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  static getCurrentUser(): { username: string } | null {
    try {
      const raw = localStorage.getItem('ngogia_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.username) return parsed;
      return null;
    } catch (e) {
      console.warn('Cannot parse ngogia_user', e);
      return null;
    }
  }

  getStorage(): string {
    return this.product?.storage || '1-2 ngày ở ngăn mát tủ lạnh';
  }
  getWeight(): string {
    return this.product?.weight || '700ml (size M) / 1000ml (size L)';
  }
  getOrigin(): string {
    return this.product?.origin || 'Việt Nam';
  }
  getTopping(): string {
    return this.product?.topping || 'Thạch dừa nguyên vị, hạt nổ củ năng';
  }
  getNote(): string {
    return this.product?.note || 'Chi tiết bổ sung về sản phẩm sẽ được cập nhật tại đây.';
  }

  /** Thêm sản phẩm related vào giỏ (giống JS renderRelated .cart2-btn) */
  addRelatedToCart(event: Event, p: ProductItem): void {
    event.preventDefault();
    event.stopPropagation();
    if (!window.NGCart) return;
    const price = this.getPriceM(p);
    window.NGCart.addItem({
      id: String(p.id || ''),
      name: String(p.name || ''),
      price,
      image: p.image || '',
      size: 'M',
      qty: 1,
    });
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { silent: true } }));
  }
}
