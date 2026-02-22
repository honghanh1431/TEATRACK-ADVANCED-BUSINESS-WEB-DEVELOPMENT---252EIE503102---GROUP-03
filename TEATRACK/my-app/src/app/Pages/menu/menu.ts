import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  category?: string;
  image?: string;
  rating?: number;
  reviews?: number;
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

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.html',
  styleUrls: ['./menu.css', '../../../styles.css'],
})
export class Menu implements OnInit {
  // Base URL cho data (public/ được serve từ root)
  private static readonly STATIC_BASE = '/';

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

  constructor(private http: HttpClient) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.fetchProducts();
  }

  // ─── Fetch ────────────────────────────────────────────────────────────────
  private fetchProducts(): void {
    const url = `${Menu.STATIC_BASE}data/products.json`;
    this.http.get<Product[]>(url).subscribe({
      next: (data) => {
        this.allData = data;
        this.categories = Array.from(
          new Set(
            data
              .map((item) => (item.category || '').trim())
              .filter(Boolean)
          )
        );
        this.updateProducts();
      },
      error: (err) => {
        console.error(err);
        this.loadError = true;
      },
    });
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
    const price = Number(product.price) || 0;
    return price + 3000;
  }

  getVipPriceM(product: Product): number {
    const price = Number(product.price) || 0;
    return Math.max(0, price - 3000);
  }

  getVipPriceL(product: Product): number {
    const priceL = this.getPriceL(product);
    return Math.max(0, priceL - 3000);
  }

  getProductLink(product: Product): string {
    return `/product/?pid=${encodeURIComponent(product.id || '')}&name=${encodeURIComponent(product.name || '')}`;
  }

  getProductImg(product: Product): string {
    const img = (product.image || '').replace(/^\//, '');
    return img ? (img.startsWith('assets/') ? img : 'assets/images/products/' + img) : 'assets/icons/menu.png';
  }

  getRating(product: Product): number {
    return typeof product.rating === 'number' ? product.rating : 4.8;
  }

  getReviews(product: Product): number {
    return product.reviews || 500;
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
    const url = this.getProductLink(product);
    window.location.href = url;
  }

  onAddToCart(event: Event, product: Product): void {
    event.preventDefault();
    event.stopPropagation();
    if (!window.NGCart) return;
    window.NGCart.addItem({
      id: product.id || '',
      name: product.name || '',
      price: Number(product.price) || 0,
      image: product.image || '',
      size: 'M',
      qty: 1,
    });
    alert(`Đã thêm ${product.name || 'sản phẩm'} vào giỏ hàng!`);
  }

  isCategoryActive(cat: string): boolean {
    return this.state.category === cat;
  }
}