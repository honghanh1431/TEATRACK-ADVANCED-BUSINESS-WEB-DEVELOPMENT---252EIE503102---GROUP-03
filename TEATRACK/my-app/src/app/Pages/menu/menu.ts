import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductStateService } from '../../product-state.service';
import { ReviewCountService } from '../../review-count.service';

declare const window: Window & {
  NGCart?: {
    totals: (items: CartItem[]) => { grand: number };
    getItems: () => CartItem[];
    price: (value: number) => string;
    addItem: (item: CartItem) => void;
  };
};

interface Product {
  id?: string;
  name?: string;
  price?: number | string;
  priceL?: number | string;
  vipPriceM?: number | string;
  vipPriceL?: number | string;
  category?: string;
  image?: string;
  rating?: number;
  reviews?: number;
  /** Nếu false thì ẩn khỏi menu (chỉ hiện khi admin bật "Hiển thị sản phẩm"). */
  visible?: boolean;
}


interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  qty?: number;
}

interface MenuState {
  category: string;
  search: string;
  sort: string;
}

import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.html',
  styleUrls: ['./menu.css', '../../../styles.css'],
  encapsulation: ViewEncapsulation.None, // Để không bị global CSS ảnh hưởng
})
export class Menu implements OnInit, AfterViewInit, OnDestroy {
  private static readonly STATIC_BASE = '/';
  private socket: Socket | undefined;

  // ─── State ────────────────────────────────────────────────────────────────
  allData: Product[] = [];
  displayedProducts: Product[] = [];
  categories: string[] = [];
  lastRenderedItems: Product[] = [];

  state: MenuState = {
    category: 'all',
    search: '',
    sort: 'featured',
  };

  resultCount = 0;
  isEmptyState = false;
  sectionTitle = 'Tất cả thức uống';
  sectionSubtitle = 'Danh sách đầy đủ các món tại Hồng Trà Ngô Gia.';
  loadError = false;
  showLoginPromptModal = false;

  /** Guest = chưa đăng nhập */
  get isGuest(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !localStorage.getItem('ngogia_user') && !localStorage.getItem('authAdmin');
  }

  get isVip(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const u = JSON.parse(localStorage.getItem('ngogia_user') || '{}');
      return u?.role === 'vip customer';
    } catch { return false; }
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private productState: ProductStateService,
    private reviewCountService: ReviewCountService,
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('productUpdated', () => {
      this.fetchProducts();
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const categoryFromUrl = this.route.snapshot.queryParamMap.get('category');
    if (categoryFromUrl != null && categoryFromUrl.trim() !== '') {
      this.state.category = categoryFromUrl.trim();
    }
    this.fetchProducts();

    if (typeof window !== 'undefined') {
      window.addEventListener('user:updated', this.handleUserUpdated);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('user:updated', this.handleUserUpdated);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  private handleUserUpdated = () => {
    this.cdr.detectChanges();
  };

  ngAfterViewInit(): void {
    if (this.state.category && this.state.category !== 'all') {
      this.scrollToContent();
    }
  }

  /** Cuộn thẳng tới khúc filter (menu-search / section-title), không scroll to top trước */
  private scrollToContent(): void {
    requestAnimationFrame(() => {
      const el = document.getElementById('menu-search') || document.getElementById('section-title');
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    });
  }

  // ─── Fetch ────────────────────────────────────────────────────────────────
  private fetchProducts(): void {
    const url = `http://localhost:3002/products`;
    this.http.get<Product[]>(url).subscribe({
      next: (data) => {
        this.allData = (data || []).filter((item) => item.visible !== false);
        this.categories = Array.from(
          new Set(
            this.allData
              .map((item) => (item.category || '').trim())
              .filter(Boolean)
          )
        );
        this.updateProducts();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch products error:', err);
        const fromStorage = this.getProductsFromStorage();
        if (fromStorage.length > 0) {
          this.allData = fromStorage.filter((item) => item.visible !== false);
          this.categories = Array.from(
            new Set(
              this.allData
                .map((item) => (item.category || '').trim())
                .filter(Boolean)
            )
          );
          this.updateProducts();
          this.cdr.detectChanges();
        } else {
          this.loadError = true;
          this.cdr.detectChanges();
        }
      },
    });
  }

  /** Sản phẩm từ localStorage (admin lưu); trả về [] nếu không có. */
  private getProductsFromStorage(): Product[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('products') : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Product[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ─── Format / Normalize helpers ──────────────────────────────────────────
  formatVND(value: number | string): string {
    const n = Number(value) || 0;
    try {
      return n.toLocaleString('vi-VN');
    } catch {
      return String(n);
    }
  }

  normalize(str: string | null | undefined): string {
    if (str == null) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  escapeAttr(value: unknown): string {
    return String(value == null ? '' : value).replace(/"/g, '&quot;');
  }

  // ─── Price helpers (dùng trong template) ─────────────────────────────────
  getPriceM(product: Product): number {
    return Number(product.price) || 0;
  }

  getPriceL(product: Product): number {
    // Dùng giá L từ database nếu có, nếu không thì tính +3000
    if (product.priceL != null && Number(product.priceL) > 0) {
      return Number(product.priceL);
    }
    return (Number(product.price) || 0) + 3000;
  }

  getVipPriceM(product: Product): number {
    // Dùng giá VIP M từ database nếu có, nếu không thì tính -3000
    if (product.vipPriceM != null && Number(product.vipPriceM) > 0) {
      return Number(product.vipPriceM);
    }
    return Math.max(0, (Number(product.price) || 0) - 3000);
  }

  getVipPriceL(product: Product): number {
    // Dùng giá VIP L từ database nếu có, nếu không thì tính từ priceL - 3000
    if (product.vipPriceL != null && Number(product.vipPriceL) > 0) {
      return Number(product.vipPriceL);
    }
    return Math.max(0, this.getPriceL(product) - 3000);
  }

  getProductLink(product: Product): string {
    return `/product/?pid=${encodeURIComponent(product.id || '')}&name=${encodeURIComponent(product.name || '')}`;
  }

  getProductImg(product: Product): string {
    const raw = (product.image || '').trim();
    if (!raw) return 'assets/icons/menu.png';
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw;
    const img = raw.replace(/^\//, '');
    return img.startsWith('assets/') ? img : 'assets/images/products/' + img;
  }

  getRating(product: Product): number {
    return typeof product.rating === 'number' ? product.rating : 4.8;
  }

  getReviews(product: Product): number {
    const fromService = this.reviewCountService.getCount(product?.id);
    if (fromService !== undefined) return fromService;
    return product?.reviews ?? 500;
  }

  // ─── Filter / Sort ────────────────────────────────────────────────────────
  private filterProducts(data: Product[], state: MenuState): Product[] {
    return data.filter((item) => {
      if (state.category && state.category !== 'all') {
        if (this.normalize(item.category) !== this.normalize(state.category)) return false;
      }
      if (state.search) {
        const query = this.normalize(state.search);
        const haystack = [item.name, item.category].map((s) => this.normalize(s)).join(' ');
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  private sortProducts(products: Product[], mode: string): Product[] {
    const items = products.slice();
    switch (mode) {
      case 'name-asc':
        items.sort((a, b) => this.normalize(a.name).localeCompare(this.normalize(b.name)));
        break;
      case 'name-desc':
        items.sort((a, b) => this.normalize(b.name).localeCompare(this.normalize(a.name)));
        break;
      case 'price-asc':
        items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case 'price-desc':
        items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      default:
        break;
    }
    return items;
  }

  private prepareProducts(data: Product[], state: MenuState): Product[] {
    const filtered = this.filterProducts(data, state);
    return this.sortProducts(filtered, state.sort || 'featured');
  }

  // ─── Update / Render ──────────────────────────────────────────────────────
  updateProducts(): void {
    const prepared = this.prepareProducts(this.allData, this.state);
    this.displayedProducts = prepared;
    this.lastRenderedItems = prepared.slice();
    this.resultCount = prepared.length;
    this.isEmptyState = prepared.length === 0;
    this.updateSectionHeading();
  }

  private updateSectionHeading(): void {
    const parts: string[] = [];
    if (this.state.search) {
      parts.push(`Từ khóa "${this.state.search}"`);
    }
    if (this.state.category && this.state.category !== 'all') {
      parts.push(this.state.category);
    }
    if (!parts.length) {
      this.sectionTitle = 'Tất cả thức uống';
      this.sectionSubtitle = 'Danh sách đầy đủ các món tại Hồng Trà Ngô Gia.';
    } else {
      this.sectionTitle = parts.join(' · ');
      this.sectionSubtitle = 'Những món phù hợp với lựa chọn của bạn.';
    }
  }

  // ─── Event handlers (gọi từ template) ────────────────────────────────────
  onCategoryClick(cat: string): void {
    this.state.category = cat;
    this.updateProducts();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.state.search = input.value.trim();
    this.updateProducts();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.state.sort = select.value;
    this.updateProducts();
  }

  onCardClick(product: Product): void {
    const id = product.id != null ? String(product.id) : '';
    const name = product.name != null ? String(product.name) : '';
    this.productState.setNextProduct(product as any);
    this.router.navigate(['/menu/product', id, name]);
  }

  closeLoginPromptModal(): void {
    this.showLoginPromptModal = false;
  }

  onAddToCart(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isGuest) {
      this.showLoginPromptModal = true;
      return;
    }
    if (!window.NGCart) return;
    const finalPrice = this.isVip ? this.getVipPriceM(product) : (Number(product.price) || 0);

    window.NGCart.addItem({
      id: product.id || '',
      name: product.name || '',
      price: finalPrice,
      image: product.image || '',
      size: 'M',
      qty: 1,
    });
  }

  isCategoryActive(cat: string): boolean {
    return this.state.category === cat;
  }
}