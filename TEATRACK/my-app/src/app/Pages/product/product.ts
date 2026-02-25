import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
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

const REVIEW_PAGE_SIZE = 4;
/** Base URL API đánh giá (my-server port 3100); bỏ trống nếu chỉ dùng local */
const REVIEWS_API_BASE = 'http://localhost:3100';

/** Tên hiển thị topping trong giỏ (key data-topping -> "Tên x1") */
const TOPPING_LABELS: Record<string, string> = {
  'suong-sao': 'Sương sáo',
  'thach-dua': 'Thạch dừa nguyên vị',
  'hat-e': 'Hạt é',
  'thach-dua-dao': 'Thạch dứa hương đào',
  'thach-aiyu': 'Thạch aiyu',
  'thach-soi-la-dua': 'Thạch sợi lá dứa',
  'thach-suong-sao-vien': 'Thạch sương sáo viên (8)',
  'tran-chau-hoang-kim': 'Trân châu hoàng kim',
  'tran-chau-duong-den': 'Trân châu đường đen',
  'tran-chau-3q': 'Trân châu 3Q trắng/đen',
  'tran-chau-khoai-mon': 'Trân châu khoai môn',
  'hat-thuy-tinh-cu-nang': 'Hạt thủy tinh củ năng',
  'hat-thuy-tinh-lua-mach': 'Hạt thủy tinh lúa mạch',
  'dao-mieng': 'Đào miếng',
  'khoai-mon-nghien': 'Khoai môn nghiền',
  'hat-sen': 'Hạt sen',
  'kem-tuoi-vani': 'Kem tươi vani',
  'kem-cheese': 'Kem cheese',
  'pudding-trung': 'Pudding trứng',
  'thach-sua-vien': 'Thạch sữa viên (8)',
};

/** Giá từng topping (đồng) để cộng vào giá món */
const TOPPING_PRICES: Record<string, number> = {
  'suong-sao': 3000, 'thach-dua': 3000, 'hat-e': 3000,
  'thach-dua-dao': 5000, 'thach-aiyu': 5000, 'thach-soi-la-dua': 5000,
  'thach-suong-sao-vien': 5000, 'tran-chau-hoang-kim': 5000, 'tran-chau-duong-den': 5000,
  'tran-chau-3q': 5000, 'tran-chau-khoai-mon': 5000, 'hat-thuy-tinh-cu-nang': 5000,
  'hat-thuy-tinh-lua-mach': 5000, 'dao-mieng': 5000, 'khoai-mon-nghien': 5000,
  'hat-sen': 7000, 'kem-tuoi-vani': 7000, 'kem-cheese': 7000, 'pudding-trung': 7000,
  'thach-sua-vien': 7000,
};

export interface ReviewItem {
  name: string;
  title: string;
  content: string;
  time: string;
  rating: number;
  /** Timestamp (ms) để sắp xếp mới nhất lên trước */
  createdAt?: number;
}

@Component({
  selector: 'app-product',
  standalone: false,
  templateUrl: './product.html',
  styleUrl: './product.css',
  encapsulation: ViewEncapsulation.None, // Để không bị global CSS ảnh hưởng

})
export class Product implements OnInit, OnDestroy {
  product: ProductItem | null = null;
  relatedProducts: ProductItem[] = [];
  allProducts: ProductItem[] = [];
  activeTab: 'desc' | 'review' | 'commit' = 'desc';
  selectedSize: 'M' | 'L' = 'M';
  selectedSweetness: 'it' | 'vua' | 'nhieu' = 'it';
  selectedIce: 'it' | 'vua' | 'nhieu' = 'it';
  qty = 1;
  mainImageIndex = 0;
  loadError = false;
  noteOpen = false;
  toppingQtys: Record<string, number> = {};
  currentPage = 1;
  /** Số sao đang chọn trong form (0 = chưa chọn, 1–5) */
  reviewFormRating = 0;
  /** Nội dung đánh giá trong form */
  reviewFormContent = '';
  reviews: ReviewItem[] = [
    { name: 'Hồng Hạnh', title: 'Tôi yêu HTVT!!!!!!!', content: 'HTVT là thức uống ngon nhất, tôi có thể uống mỗi ngày!', time: '2 ngày trước', rating: 5, createdAt: 0 },
    { name: 'Bảo Vy', title: 'So good, so yummy', content: 'HTVT rất ngon, tuyệt vời!', time: '3 ngày trước', rating: 5, createdAt: 0 },
    { name: 'Trung Nhân', title: 'Đáng thử', content: 'Lần đầu uống thấy ổn, sẽ quay lại.', time: '5 ngày trước', rating: 4, createdAt: 0 },
    { name: 'Hoàng Đức', title: 'Ngon đúng vị', content: 'Vị trà và vải hài hòa, không quá ngọt.', time: '1 tuần trước', rating: 5, createdAt: 0 },
    { name: 'Thanh Thanh', title: 'Recommend', content: 'Bạn bè giới thiệu, uống xong ghiền.', time: '1 tuần trước', rating: 5, createdAt: 0 },
    { name: 'Thế Hưng', title: 'Tạm được', content: 'Giá hơi cao nhưng chất lượng ổn.', time: '2 tuần trước', rating: 4, createdAt: 0 },
  ];
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
    document.body.style.overflow = '';
    // Gán createdAt cho review mẫu (mới nhất trước khi sort)
    const day = 24 * 60 * 60 * 1000;
    this.reviews.forEach((r, i) => {
      if (r.createdAt == null || r.createdAt === 0) {
        r.createdAt = Date.now() - (i + 2) * day * 2;
      }
    });
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
        if (found) this.loadReviewsForProduct(String(found.id));
        this.cdr.detectChanges();
        setTimeout(() => this.logRatingStyles(), 150);
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

  // #region agent log
  private logRatingStyles(): void {
    const el = document.getElementById('prod-rating-text');
    if (!el) return;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;
    const pCs = parent ? getComputedStyle(parent) : null;
    const payload = {
      sessionId: '2dca64',
      runId: 'run1',
      hypothesisId: 'H1',
      location: 'product.ts:logRatingStyles',
      message: 'Rating text computed style and rect',
      data: {
        transform: cs.transform,
        display: cs.display,
        rectTop: rect.top,
        rectLeft: rect.left,
        height: rect.height,
        parentDisplay: pCs?.display ?? null,
        parentAlignItems: pCs?.alignItems ?? null,
        parentOverflow: pCs?.overflow ?? null,
      },
      timestamp: Date.now(),
    };
    fetch('http://127.0.0.1:7466/ingest/4eac26d1-7e6d-41e3-8da1-1c8d157fd1de', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2dca64' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
  // #endregion

  setMainImage(i: number): void {
    this.mainImageIndex = i;
  }

  selectSize(size: 'M' | 'L'): void {
    this.selectedSize = size;
  }

  selectSweetness(value: 'it' | 'vua' | 'nhieu'): void {
    this.selectedSweetness = value;
  }

  selectIce(value: 'it' | 'vua' | 'nhieu'): void {
    this.selectedIce = value;
  }

  getToppingQty(key: string): number {
    return this.toppingQtys[key] ?? 0;
  }

  changeToppingQty(key: string, delta: number): void {
    const current = this.toppingQtys[key] ?? 0;
    this.toppingQtys = { ...this.toppingQtys, [key]: Math.max(0, current + delta) };
  }

  toggleNote(): void {
    this.noteOpen = !this.noteOpen;
  }

  changeQty(delta: number): void {
    this.qty = Math.max(1, Math.min(99, this.qty + delta));
  }

  private getSelectedToppings(): string[] {
    const out: string[] = [];
    for (const key of Object.keys(this.toppingQtys)) {
      const q = this.toppingQtys[key] || 0;
      if (q <= 0) continue;
      const label = TOPPING_LABELS[key] || key;
      out.push(`${label} x${q}`);
    }
    return out;
  }

  /** Giá gốc + tổng tiền topping (cho 1 phần) */
  private getTotalPriceWithToppings(): number {
    const base = this.selectedSize === 'L' ? this.getPriceL(this.product!) : this.getPriceM(this.product!);
    let add = 0;
    for (const key of Object.keys(this.toppingQtys)) {
      const q = this.toppingQtys[key] || 0;
      if (q <= 0) continue;
      add += q * (TOPPING_PRICES[key] ?? 0);
    }
    return base + add;
  }

  addToCart(): void {
    if (!this.product || !window.NGCart) return;
    const sweetnessLabel = this.selectedSweetness === 'it' ? 'Ít' : this.selectedSweetness === 'vua' ? 'Vừa' : 'Nhiều';
    const iceLabel = this.selectedIce === 'it' ? 'Ít' : this.selectedIce === 'vua' ? 'Vừa' : 'Nhiều';
    const toppings = this.getSelectedToppings();
    (window.NGCart.addItem as any)({
      id: String(this.product.id || ''),
      name: String(this.product.name || ''),
      price: this.getTotalPriceWithToppings(),
      image: this.product.image || '',
      size: this.selectedSize,
      sweetness: sweetnessLabel,
      ice: iceLabel,
      toppings: toppings.length ? toppings : undefined,
      qty: this.qty,
    });
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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.reviews.length / REVIEW_PAGE_SIZE));
  }

  /** Danh sách review đã sắp theo thời gian (mới nhất trước) */
  get sortedReviews(): ReviewItem[] {
    return [...this.reviews].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  get displayedReviews(): ReviewItem[] {
    const sorted = this.sortedReviews;
    const start = (this.currentPage - 1) * REVIEW_PAGE_SIZE;
    return sorted.slice(start, start + REVIEW_PAGE_SIZE);
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 5) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    return [1, 2, 3, 4];
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  /** Chọn số sao trong form đánh giá (1–5) */
  setReviewRating(star: number): void {
    this.reviewFormRating = Math.min(5, Math.max(1, star));
  }

  /** Tải đánh giá theo productId từ API (nếu có server); thất bại thì giữ danh sách hiện tại */
  private loadReviewsForProduct(productId: string): void {
    if (!REVIEWS_API_BASE) return;
    this.http.get<ReviewItem[]>(`${REVIEWS_API_BASE}/reviews?productId=${encodeURIComponent(productId)}`).subscribe({
      next: (list) => {
        if (Array.isArray(list)) {
          list.forEach((r) => { if (r.createdAt == null) r.createdAt = 0; });
          this.reviews = list;
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  /** Gửi đánh giá: gửi lên API (nếu có), thêm vào danh sách (mới nhất lên đầu) và reset form */
  submitReview(): void {
    const rating = this.reviewFormRating;
    if (rating < 1) return;
    const content = (this.reviewFormContent || '').trim();
    const user = Product.getCurrentUser();
    const name = user?.username || 'Khách';
    const title = content ? content.split('\n')[0].slice(0, 80) || 'Đánh giá' : 'Đánh giá';
    const createdAt = Date.now();
    const newReview: ReviewItem = {
      name,
      title,
      content: content || '(Không có nội dung)',
      time: 'Vừa xong',
      rating,
      createdAt,
    };
    this.reviews.unshift(newReview);
    this.reviewFormRating = 0;
    this.reviewFormContent = '';
    this.currentPage = 1;
    this.cdr.detectChanges();
    if (REVIEWS_API_BASE && this.product?.id) {
      const body = { productId: String(this.product.id), name, title, content: newReview.content, time: newReview.time, rating, createdAt };
      this.http.post(`${REVIEWS_API_BASE}/reviews`, body).subscribe({ error: () => {} });
    }
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
  }
}
