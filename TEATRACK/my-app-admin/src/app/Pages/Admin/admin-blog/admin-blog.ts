import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
type PostStatus = 'published' | 'draft';
interface ToastItem {
  id: string;
  type: 'ok' | 'err';
  title: string;
  sub?: string;
}
interface BlogRow {
  id: string;
  code: string;
  title: string;
  excerpt: string;
  content: string;
  date: Date;
  image: string;
  images: string[];
  layoutType: string;
  status: PostStatus;
  views: number;
  visible: boolean;
}

@Component({
  selector: 'admin-blog',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-blog.html',
  styleUrls: ['./admin-blog.css'],
})
export class AdminBlog implements OnInit {
  currentUserName = 'Nguyễn Ba Đù';
  stats = {
    total: 0,
    views: 0,
    published: 0,
    draft: 0,
  };

  q = '';
  status: '' | PostStatus = '';

  postsAll: BlogRow[] = [];
  filtered: BlogRow[] = [];

  page = 1;
  pageSize = 8;

  modalOpen = false;
  editing = false;
  editingId: string | null = null;

  form!: FormGroup;
  formImages: string[] = [];

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  deleteOpen = false;
  deleteTarget: BlogRow | null = null;

  toasts: ToastItem[] = [];

  private readonly LS_KEY = 'admin_blog_posts_v2';
  private readonly API_BASE = 'http://localhost:3002';
  private readonly BLOG_API = 'http://localhost:3002/blog';

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef, private http: HttpClient) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      excerpt: ['', [Validators.required]],
      content: ['', [Validators.required]],
    });

    this.load();
    this.applyFilters();
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pages(): number[] {
    const total = this.totalPages;
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  get pagedPosts(): BlogRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  goPage(n: number): void {
    if (n < 1) n = 1;
    if (n > this.totalPages) n = this.totalPages;
    this.page = n;
  }

  onSearch(v: string): void {
    this.q = v ?? '';
    this.applyFilters();
  }

  onStatus(v: string): void {
    this.status = (v as any) || '';
    this.applyFilters();
  }

  private applyFilters(): void {
    const q = this.q.trim().toLowerCase();

    this.filtered = this.postsAll.filter(p => {
      const okStatus = this.status ? p.status === this.status : true;
      const okQuery = q
        ? (p.title || '').toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q)
        : true;
      return okStatus && okQuery;
    });

    this.page = Math.min(this.page, this.totalPages);
    this.computeStats();
    this.cdr.detectChanges();
  }

  openAdd(): void {
    this.editing = false;
    this.editingId = null;
    this.form.reset({ title: '', excerpt: '', content: '' });
    this.formImages = [];
    this.modalOpen = true;
  }

  openEdit(p: BlogRow): void {
    this.editing = true;
    this.editingId = p.id;
    this.form.reset({ title: p.title, excerpt: p.excerpt, content: p.content });
    this.formImages = [...(p.images || [])];
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editing = false;
    this.editingId = null;
    this.clearFileInput();
  }

  backdropClose(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('modal')) {
      this.closeModal();
    }
  }

  async onFiles(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    for (const f of files) {
      const b64 = await this.fileToBase64(f);
      this.formImages.push(b64);
    }
    this.clearFileInput();
  }

  removeImg(i: number): void {
    this.formImages.splice(i, 1);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast('err', '❌ Thiếu thông tin', 'Vui lòng nhập đủ tiêu đề / mô tả / nội dung.');
      return;
    }
    if (this.formImages.length === 0) {
      this.toast('err', '❌ Thiếu hình ảnh', 'Vui lòng tải lên ít nhất 1 hình.');
      return;
    }

    const v = this.form.value as { title: string; excerpt: string; content: string };

    if (this.editing && this.editingId) {
      const idx = this.postsAll.findIndex(x => x.id === this.editingId);
      if (idx === -1) {
        this.toast('err', '❌ Không tìm thấy bài', 'Bài viết không tồn tại.');
        return;
      }

      const body = {
        title: String(v.title || '').trim(),
        excerpt: String(v.excerpt || '').trim(),
        content: String(v.content || '').trim(),
        images: [...this.formImages],
        image: this.formImages[0],
        layoutType: this.formImages.length > 1 ? 'gallery' : 'single',
      };

      this.http.put<BlogRow[]>(`${this.BLOG_API}/${this.editingId}`, body).subscribe({
        next: (data) => {
          this.postsAll = (data || []).map(x => this.hydrate(x));
          this.persist();
          this.applyFilters();
          this.closeModal();
          this.toast('ok', 'CẬP NHẬT THÀNH CÔNG');
        },
        error: (err) => {
          console.error(err);
          this.toast('err', 'LỖI CẬP NHẬT');
        }
      });
      return;
    }

    const newPost: Partial<BlogRow & { layoutType: string }> = {
      code: this.nextCode(),
      title: String(v.title || '').trim(),
      excerpt: String(v.excerpt || '').trim(),
      content: String(v.content || '').trim(),
      date: new Date(),
      images: [...this.formImages],
      image: this.formImages[0],
      layoutType: this.formImages.length > 1 ? 'gallery' : 'single',
      status: 'published',
      views: 0,
      visible: true,
    };

    this.http.post<BlogRow[]>(this.BLOG_API, newPost).subscribe({
      next: (data) => {
        this.postsAll = (data || []).map(x => this.hydrate(x));
        this.persist();
        this.applyFilters();
        this.closeModal();
        this.toast('ok', 'THÊM BÀI VIẾT THÀNH CÔNG');
      },
      error: (err) => {
        console.error(err);
        this.toast('err', 'LỖI THÊM BÀI VIẾT');
      }
    });
  }

  toggleVisible(p: BlogRow): void {
    const newVal = !p.visible;
    this.http.put<BlogRow[]>(`${this.BLOG_API}/${p.id}`, { visible: newVal }).subscribe({
      next: (data) => {
        this.postsAll = (data || []).map(x => this.hydrate(x));
        this.persist();
        this.applyFilters();
        this.toast('ok', newVal ? 'Đã bật hiển thị' : 'Đã tắt hiển thị');
      },
      error: () => this.toast('err', 'LỖI THAY ĐỔI HIỂN THỊ')
    });
  }

  openDelete(p: BlogRow): void {
    this.deleteTarget = p;
    this.deleteOpen = true;
  }

  closeDelete(): void {
    this.deleteOpen = false;
    this.deleteTarget = null;
  }

  backdropCloseDelete(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('modal')) {
      this.closeDelete();
    }
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.id;
    this.http.delete<BlogRow[]>(`${this.BLOG_API}/${id}`).subscribe({
      next: (data) => {
        this.postsAll = (data || []).map(x => this.hydrate(x));
        this.persist();
        this.applyFilters();
        this.closeDelete();
        this.toast('ok', 'XÓA BÀI VIẾT THÀNH CÔNG');
      },
      error: () => this.toast('err', 'LỖI XÓA BÀI VIẾT')
    });
  }

  private static readonly PLACEHOLDER_IMG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  imgFallback(ev: Event): void {
    const img = ev.target as HTMLImageElement;
    img.src = AdminBlog.PLACEHOLDER_IMG;
  }

  toast(type: 'ok' | 'err', title: string, sub?: string): void {
    const t: ToastItem = {
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      title,
      sub,
    };
    this.toasts.unshift(t);
    setTimeout(() => this.removeToast(t.id), 2500);
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  private load(): void {
    this.http.get<BlogRow[]>(this.BLOG_API).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length) {
          this.postsAll = data.map(x => this.hydrate(x));
          this.computeStats();
          this.persist();
          this.applyFilters();
        } else {
          this.loadLocal();
        }
      },
      error: () => {
        this.loadLocal();
      }
    });
  }

  private loadLocal(): void {
    const raw = localStorage.getItem(this.LS_KEY);
    if (raw) {
      try {
        const arr = JSON.parse(raw) as any[];
        if (Array.isArray(arr) && arr.length) {
          this.postsAll = arr.map(x => this.hydrate(x));
          this.computeStats();
          this.applyFilters();
          return;
        }
      } catch { }
    }
    this.postsAll = this.seed();
    this.persist();
    this.computeStats();
    this.applyFilters();
  }

  private persist(): void {
    localStorage.setItem(this.LS_KEY, JSON.stringify(this.postsAll));
  }

  private hydrate(x: any): BlogRow {
    return {
      id: String(x.id || `blog_${Date.now()}`),
      code: String(x.code || 'NG00000'),
      title: String(x.title || ''),
      excerpt: String(x.excerpt || ''),
      content: String(x.content || ''),
      date: x.date ? new Date(x.date) : new Date(),
      image: String(x.image || AdminBlog.PLACEHOLDER_IMG),
      images: Array.isArray(x.images) ? x.images.map((s: any) => String(s)) : [String(x.image || '')].filter(Boolean),
      layoutType: String(x.layoutType || (Array.isArray(x.images) && x.images.length > 1 ? 'gallery' : 'single')),
      status: (x.status === 'draft' ? 'draft' : 'published') as PostStatus,
      views: Number(x.views || 0),
      visible: Boolean(x.visible ?? true),
    };
  }

  private seed(): BlogRow[] {
    const img = (n: number) => `assets/images/blog/poster-${n}.png`;

    const daysAgo = (d: number) => {
      const t = new Date();
      t.setDate(t.getDate() - d);
      return t;
    };

    const base: BlogRow[] = [
      {
        id: 'blog_1',
        code: 'NG00120',
        title: 'CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10/2025',
        excerpt: 'Chúc mừng 20/10...',
        content: 'Nội dung demo...',
        date: daysAgo(2),
        image: 'assets/images/blog_5.jpg',
        images: ['assets/images/blog_5.jpg'],
        status: 'published',
        views: 127,
        visible: true,
        layoutType: 'single',
      },
      {
        id: 'blog_2',
        code: 'NG00118',
        title: 'VẸN TRỌN TRUNG THU - TRÒN VẠN NGÔ GIA',
        excerpt: 'Trung thu...',
        content: 'Nội dung demo...',
        date: daysAgo(10),
        image: 'assets/images/blog_3.jpg',
        images: ['assets/images/blog_3.jpg'],
        status: 'published',
        views: 88,
        visible: true,
        layoutType: 'single',
      },
      {
        id: 'blog_3',
        code: 'NG00117',
        title: 'KHAI TRƯƠNG CHI NHÁNH MỚI - ƯU ĐÃI ĐẶC BIỆT',
        excerpt: 'Ưu đãi khai trương...',
        content: 'Nội dung demo...',
        date: daysAgo(18),
        image: img(3),
        images: [img(3)],
        status: 'draft',
        views: 15,
        visible: false,
        layoutType: 'single',
      },
      {
        id: 'blog_4',
        code: 'NG00116',
        title: 'BÍ QUYẾT CHỌN TRÀ NGON CHUẨN NGÔ GIA',
        excerpt: 'Gợi ý chọn trà...',
        content: 'Nội dung demo...',
        date: daysAgo(25),
        image: img(4),
        images: [img(4)],
        status: 'published',
        views: 44,
        visible: true,
        layoutType: 'single',
      },
    ];

    const more: BlogRow[] = Array.from({ length: 10 }, (_, i) => {
      const codeNum = 115 - i;
      return {
        id: `seed_${i}`,
        code: 'NG0' + String(codeNum).padStart(4, '0'),
        title: `BÀI VIẾT SỐ ${i + 1} - NGÔ GIA`,
        excerpt: 'Mô tả ngắn...',
        content: 'Nội dung...',
        date: daysAgo(30 + i),
        image: img((i % 4) + 1),
        images: [img((i % 4) + 1)],
        status: i % 4 === 0 ? 'draft' : 'published',
        views: 10 + i * 3,
        visible: true,
        layoutType: 'single',
      } satisfies BlogRow;
    });

    return [...base, ...more];
  }

  private computeStats(): void {
    this.stats.total = this.postsAll.length;
    this.stats.views = this.postsAll.reduce((s, p) => s + (p.views || 0), 0);
    this.stats.published = this.postsAll.filter(p => p.status === 'published').length;
    this.stats.draft = this.postsAll.filter(p => p.status === 'draft').length;
  }

  private nextCode(): string {
    const nums = this.postsAll
      .map(p => (p.code || '').replace(/\D/g, ''))
      .map(s => Number(s))
      .filter(n => Number.isFinite(n) && n > 0);

    const max = nums.length ? Math.max(...nums) : 100;
    const next = max + 1;
    return 'NG' + String(next).padStart(5, '0');
  }

  private clearFileInput(): void {
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('read fail'));
      r.readAsDataURL(file);
    });
  }
}
