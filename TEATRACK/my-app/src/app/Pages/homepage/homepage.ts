import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

import Swiper from 'swiper';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';

Swiper.use([Autoplay, Navigation, Pagination]);

type ProductId = number | string;

interface Product {
  id?: ProductId;
  name?: string;
  image?: string;
  category?: string;
  tag?: string;
  price?: number;
  rating?: number;
  reviews?: number;
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css'],
})
export class Homepage implements OnInit, AfterViewInit, OnDestroy {
  vipPrice(n: number): number {
    return Math.max(0, n - 3000);
  }
  @ViewChild('drinksSwiperEl') drinksSwiperEl?: ElementRef<HTMLElement>;

  // data
  private ALL_PRODUCTS: Product[] = [];

  hotMenuItems: Product[] = [];
  topHotItems: Product[] = [];

  showDrinksModal = false;
  selectedSlug = '';
  modalItems: Product[] = [];

  // swipers
  private heroSwiper: Swiper | null = null;
  private drinksSwiper: Swiper | null = null;

  // category map
  private readonly CAT_MAP: Record<string, string> = {
    'thuan-tra': 'Loại Thuần Trà',
    'tra-latte': 'Loại Trà Latte',
    'tra-sua': 'Loại Trà Sữa',
    'mon-moi': 'Thức Uống Mới',
    'mon-hot': 'Thức UỐng Hot',
    'tra-trai-cay': 'Loại Trà Trái Cây',
  };

  private readonly FALLBACK_TAGS: Record<string, string> = {
    'mon-moi': 'moi',
    'mon-hot': 'hot',
  };

  private readonly NAME_TO_SLUG: Record<string, string>;

  // backend api base 
  private readonly API_PRODUCTS = '/api/products/';

  constructor(private http: HttpClient, private router: Router) {
    this.NAME_TO_SLUG = Object.fromEntries(
      Object.entries(this.CAT_MAP).map(([slug, name]) => [this.normalize(name), slug])
    );
  }

  async ngOnInit(): Promise<void> {
    await this.ensureProducts();
    this.renderTopHot();
    this.renderHotMenu();
  }

  ngAfterViewInit(): void {
    // Swiper hero
    this.heroSwiper = new Swiper('.mySwiper', {
      loop: true,
      slidesPerView: 1,
      direction: 'horizontal',
      grabCursor: true,        
      simulateTouch: true,     
      allowTouchMove: true,    
      pagination: { el: '.swiper-pagination', clickable: true },
      autoplay: { delay: 3000, disableOnInteraction: false },
    });
  }

  ngOnDestroy(): void {
    this.heroSwiper?.destroy(true, true);
    this.drinksSwiper?.destroy(true, true);
    this.heroSwiper = null;
    this.drinksSwiper = null;
  }

  // backend load products
  private async ensureProducts(): Promise<void> {
    if (this.ALL_PRODUCTS.length) return;

    try {
      const data = await this.http.get<Product[]>(this.API_PRODUCTS).toPromise();
      this.ALL_PRODUCTS = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Cannot load products from API', err);
      this.ALL_PRODUCTS = [];
    }
  }

  // utils
  normalize(str: string = ''): string {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private toSlug(input: string = ''): string {
    const raw = String(input || '').trim();
    if (!raw) return '';

    const lower = raw.toLowerCase();
    if (this.CAT_MAP[lower]) return lower;

    const normalized = this.normalize(raw);
    if (this.NAME_TO_SLUG[normalized]) return this.NAME_TO_SLUG[normalized];
    if (this.CAT_MAP[normalized]) return normalized;

    return lower.replace(/\s+/g, '-');
  }

  priceVN(n: number): string {
    if (typeof n !== 'number' || Number.isNaN(n)) return '';
    try {
      return n.toLocaleString('vi-VN');
    } catch {
      return String(n);
    }
  }

  normSrc(path?: string): string {
    if (!path) return '';
    const s = String(path);
    if (s.startsWith('http')) return s;
    if (s.startsWith('assets/')) return s;
    if (s.startsWith('/assets/')) return s.slice(1);
    return 'assets/' + s.replace(/^\/+/, '').replace(/^assets\/+/, '');
  }

  // Pick products by category
  private pickProductsBySlug(slugOrName: string) {
    const normalizedSlug = this.toSlug(slugOrName);
    const categoryName = this.CAT_MAP[normalizedSlug] || slugOrName;
    const targetNorm = this.normalize(categoryName);

    let items = this.ALL_PRODUCTS.filter(p => this.normalize(p.category || '') === targetNorm);

    // fallback tag
    if (!items.length && this.FALLBACK_TAGS[normalizedSlug]) {
      const tagNorm = this.normalize(this.FALLBACK_TAGS[normalizedSlug]);
      items = this.ALL_PRODUCTS.filter(p => this.normalize(p.tag || '').includes(tagNorm));
    }

    // fallback contains slug
    if (!items.length && normalizedSlug) {
      items = this.ALL_PRODUCTS.filter(p => this.normalize(p.category || '').includes(normalizedSlug));
    }
    if (!items.length) items = this.ALL_PRODUCTS.slice(0, 12);

    return { slug: normalizedSlug, items: items.slice(0, 12) };
  }

  // Render sections
  private renderTopHot(): void {
    this.topHotItems = [...this.ALL_PRODUCTS]
      .sort((a, b) => (Number(b.rating || 0) - Number(a.rating || 0)) || (Number(a.id || 0) - Number(b.id || 0)))
      .slice(0, 9);
  }

  private renderHotMenu(): void {
    const { items } = this.pickProductsBySlug('mon-moi');
    this.hotMenuItems = [...items].sort(() => Math.random() - 0.5).slice(0, 4);
  }

  // Modal
  async openDrinksModal(slugOrName: string): Promise<void> {
    await this.ensureProducts();

    const { items, slug } = this.pickProductsBySlug(slugOrName);
    this.selectedSlug = slug;
    this.modalItems = items;

    this.showDrinksModal = true;
    document.body.style.overflow = 'hidden';

    setTimeout(() => this.initModalSwiper(), 0);
  }

  closeDrinksModal(): void {
    this.showDrinksModal = false;
    document.body.style.overflow = '';

    this.drinksSwiper?.destroy(true, true);
    this.drinksSwiper = null;
  }

  private initModalSwiper(): void {
    this.drinksSwiper?.destroy(true, true);
    this.drinksSwiper = null;

    if (!this.drinksSwiperEl?.nativeElement) return;

    this.drinksSwiper = new Swiper('.drinks-swiper', {
      slidesPerView: 3,
      spaceBetween: 32,
      loop: true,
      navigation: {
        nextEl: '.drinks-right .swiper-button-next',
        prevEl: '.drinks-right .swiper-button-prev',
      },
      breakpoints: {
        1024: { slidesPerView: 3 },
        768: { slidesPerView: 3 },
        480: { slidesPerView: 2 },
        0: { slidesPerView: 1 },
      },
    });
  }

  // Actions
  goCart(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.router.navigateByUrl('/cart');
  }
}