import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  AfterViewInit,
  ViewChild,
  ChangeDetectorRef,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { io, Socket } from 'socket.io-client';
type PostStatus = 'published' | 'draft';
interface ToastItem {
  id: string;
  type: 'ok' | 'err';
  title: string;
  sub?: string;
  closing?: boolean;
}
interface BlogRow {
  id: string;
  code: string;
  title: string;
  excerpt: string;
  content: string;
  date: any;
  image: string;
  images: string[];
  thumbnailImage?: string;
  heading?: string;
  headingColor?: string;
  layoutType: string;
  status: PostStatus;
  views: number;
  visible: boolean;
}

@Component({
  selector: 'admin-blog',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, AngularEditorModule],
  templateUrl: './admin-blog.html',
  styleUrls: ['./admin-blog.css'],
})
export class AdminBlog implements OnInit, AfterViewInit, OnDestroy {
  currentUserName = 'Nguyễn Ba Đù';
  private socket: Socket | undefined;
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
  pageSize = 999; // Tăng lên số lớn để hiển thị tất cả bài viết trên 1 trang (cuộn)

  modalOpen = false;
  editing = false;
  editingId: string | null = null;

  form!: FormGroup;
  formImages: string[] = [];
  formThumbnail: string | null = null;

  initialFormValue: any = null;
  initialImages: string[] = [];
  initialThumbnail: string | null = null;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('thumbInput') thumbInput?: ElementRef<HTMLInputElement>;

  deleteOpen = false;
  deleteTarget: BlogRow | null = null;

  showAlert = false;
  alertMessage = '';

  toasts: ToastItem[] = [];

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '250px',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'no',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Nhập nội dung bài viết...',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Inter',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'inter', name: 'Inter' },
    ],
    toolbarHiddenButtons: [['insertImage', 'insertVideo']],
  };

  private readonly LS_KEY = 'admin_blog_posts_v2';
  private readonly API_BASE = 'http://localhost:3002';
  private readonly BLOG_API = 'http://localhost:3002/blog';

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private zone: NgZone,
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('blogUpdated', (data: any) => {
      // Nếu là sự kiện cập nhật lượt xem, ta cập nhật trực tiếp để tránh load lại toàn bộ danh sách
      if (data && data.action === 'view' && data.id) {
        const post = this.postsAll.find(p => p.id === data.id || p.code === data.id);
        if (post) {
          post.views = data.views;
          this.computeStats();
          this.cdr.detectChanges();
          return;
        }
      }
      // Các trường hợp khác (thêm/xóa/sửa nội dung) thì load lại bài viết
      this.load();
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      heading: ['', [Validators.required]],
      headingColor: ['#ffffff', []],
      content: ['', [Validators.required]],
      layoutType: ['single', []],
      status: ['published', []],
    });

    this.load();
    this.applyFilters();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  ngAfterViewInit(): void {
    this.initSuccessModal();
  }

  showSuccess(message = 'THÀNH CÔNG'): void {
    const modal = document.getElementById('modal-success');
    const messageEl = document.getElementById('success-message');
    if (!modal) return;
    if (messageEl) messageEl.textContent = message;
    (modal as HTMLElement).style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);

    // Tự động đóng sau 1.5 giây
    setTimeout(() => {
      this.hideSuccess();
    }, 1500);
  }

  hideSuccess(): void {
    const modal = document.getElementById('modal-success');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => ((modal as HTMLElement).style.display = 'none'), 300);
  }

  private initSuccessModal(): void {
    const btn = document.getElementById('btn-close-success');
    if (btn) btn.addEventListener('click', () => this.hideSuccess());
    document
      .querySelectorAll('[data-close-success]')
      .forEach((el) => el.addEventListener('click', () => this.hideSuccess()));
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const m = document.getElementById('modal-success');
      if (m?.classList.contains('show')) this.hideSuccess();
    });
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

  async exportExcel(): Promise<void> {
    const data = this.filtered.length ? this.filtered : this.postsAll;
    if (!data.length) {
      this.showAlertModal('Không có bài viết để xuất!');
      return;
    }
    const ExcelJSLib = (window as any).ExcelJS;
    const saveAsLib = (window as any).saveAs;
    if (!ExcelJSLib || !saveAsLib) {
      this.showAlertModal('Thư viện xuất Excel chưa tải xong. Vui lòng tải lại trang.');
      return;
    }
    const workbook = new ExcelJSLib.Workbook();
    const sheet = workbook.addWorksheet('Danh sách bài viết', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0088FF' } },
      alignment: { horizontal: 'center' as const },
    };
    sheet.columns = [
      { header: 'ID', key: 'code', width: 12 },
      { header: 'Ngày đăng', key: 'date', width: 14 },
      { header: 'Tiêu đề', key: 'title', width: 32 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Lượt xem', key: 'views', width: 12 },
      { header: 'Hiển thị', key: 'visible', width: 10 },
    ];
    sheet.getRow(1).eachCell((cell: any) => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
    });
    for (const p of data) {
      sheet.addRow({
        code: p.code || p.id || '',
        date: p.date || '',
        title: (p.title || p.heading || '').slice(0, 100),
        status: p.status === 'published' ? 'Công khai' : 'Bản nháp',
        views: p.views ?? 0,
        visible: p.visible ? 'Có' : 'Không',
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().split('T')[0];
    saveAsLib(new Blob([buffer]), `Dien_dan_${today}.xlsx`);
    this.showAlertModal('Đã xuất danh sách bài viết ra file Excel thành công.');
  }

  showAlertModal(message: string): void {
    this.alertMessage = message;
    this.showAlert = true;
    this.cdr.detectChanges();
  }

  closeAlertModal(): void {
    this.showAlert = false;
    this.cdr.detectChanges();
  }

  closeAlertOnOverlay(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('alert-overlay')) this.closeAlertModal();
  }

  private applyFilters(): void {
    const q = this.q.trim().toLowerCase();

    this.filtered = this.postsAll.filter((p) => {
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
    this.form.reset({
      title: '',
      heading: '',
      headingColor: '#305C33',
      content: '',
      layoutType: 'single',
      status: 'published',
    });
    this.formImages = [];
    this.formThumbnail = null;
    this.modalOpen = true;

    this.initialFormValue = this.form.value;
    this.initialImages = [...this.formImages];
    this.initialThumbnail = this.formThumbnail;

    this.cdr.detectChanges();
  }

  openEdit(p: BlogRow): void {
    this.editing = true;
    this.editingId = p.id;
    this.form.reset({
      title: p.title || '',
      heading: p.heading || '',
      headingColor: p.headingColor || '#305C33',
      content: p.content || '',
      layoutType: p.layoutType || 'single',
      status: p.status || 'published',
    });
    this.formImages = [...(p.images || [])];
    this.formThumbnail = p.thumbnailImage || null;
    this.modalOpen = true;

    this.initialFormValue = this.form.value;
    this.initialImages = [...this.formImages];
    this.initialThumbnail = this.formThumbnail;

    this.cdr.detectChanges();
  }

  // Bỏ stripTags vì giờ dùng Editor cần giữ HTML

  onColorInput(v: string): void {
    let hex = v.trim();
    if (hex && !hex.startsWith('#')) {
      hex = '#' + hex;
    }
    // Update if it's a valid hex format (3 or 6 hex digits, or in between while typing)
    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
      this.form.get('headingColor')?.setValue(hex);
    }
  }

  hasChanges(): boolean {
    if (!this.initialFormValue) return false;
    
    // Check form changes
    const currentForm = this.form.value;
    for (const key of Object.keys(this.initialFormValue)) {
      if (currentForm[key] !== this.initialFormValue[key]) return true;
    }
    
    // Check thumbnail changes
    if (this.formThumbnail !== this.initialThumbnail) return true;
    
    // Check images array changes
    if (this.formImages.length !== this.initialImages.length) return true;
    for (let i = 0; i < this.formImages.length; i++) {
      if (this.formImages[i] !== this.initialImages[i]) return true;
    }
    
    return false;
  }

  tryCloseModal(): void {
    if (this.hasChanges()) {
      if (confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy?')) {
        this.closeModal();
      }
    } else {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editing = false;
    this.editingId = null;
    this.initialFormValue = null;
    this.clearFileInput();
    this.clearThumbInput();
  }

  backdropClose(ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (target?.classList.contains('account-modal-overlay') || target?.classList.contains('modal')) {
      this.tryCloseModal();
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
    this.cdr.detectChanges();
  }

  async onThumbFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.formThumbnail = await this.fileToBase64(file);
    this.clearThumbInput();
    this.cdr.detectChanges();
  }

  removeThumb(): void {
    this.formThumbnail = null;
    this.cdr.detectChanges();
  }

  removeImg(i: number): void {
    this.formImages.splice(i, 1);
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast('err', 'Thiếu thông tin', 'Vui lòng nhập đủ tiêu đề / mô tả / nội dung.');
      return;
    }
    if (this.formImages.length === 0) {
      this.toast('err', 'Thiếu hình ảnh', 'Vui lòng tải lên ít nhất 1 hình.');
      return;
    }

    const v = this.form.value;

    if (this.editing && this.editingId) {
      const idx = this.postsAll.findIndex((x) => x.id === this.editingId);
      if (idx === -1) {
        this.toast('err', 'Không tìm thấy bài', 'Bài viết không tồn tại.');
        return;
      }

      const body = {
        title: String(v.title || '').trim(),
        heading: String(v.heading || '').trim(),
        headingColor: String(v.headingColor || '').trim(),
        content: String(v.content || '').trim(),
        images: [...this.formImages],
        thumbnailImage: this.formThumbnail || this.formImages[0],
        image: this.formImages[0],
        layoutType: String(v.layoutType || 'single'),
        status: (v.status === 'draft' ? 'draft' : 'published') as PostStatus,
        visible: v.status === 'published', // Nháp thì tự động ẩn
      };

      // Cập nhật dữ liệu vào mảng postsAll hiện tại một cách an toàn
      this.postsAll[idx] = {
        ...this.postsAll[idx],
        ...body,
      };

      this.http.put<BlogRow[]>(`${this.BLOG_API}/${this.editingId}`, body).subscribe({
        next: (data) => {
          this.postsAll = (data || []).map((x) => this.hydrate(x));
          this.applyFilters();
          this.closeModal();
          this.showSuccess('CẬP NHẬT THÀNH CÔNG');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.toast('err', 'LỖI CẬP NHẬT');
          this.cdr.detectChanges();
        },
      });
      return;
    }

    const newPost: Omit<BlogRow, 'id'> = {
      code: this.nextCode(),
      title: String(v.title || '').trim(),
      heading: String(v.heading || '').trim(),
      headingColor: String(v.headingColor || '').trim(),
      content: String(v.content || '').trim(),
      excerpt: '', // Thêm trường còn thiếu trong BlogRow
      date: new Date().toLocaleDateString('en-GB'),
      images: [...this.formImages],
      thumbnailImage: this.formThumbnail || this.formImages[0],
      image: this.formImages[0],
      layoutType: String(v.layoutType || 'single'),
      status: (v.status === 'draft' ? 'draft' : 'published') as PostStatus,
      views: 0,
      visible: v.status === 'published', // Nháp thì tự động ẩn
    };

    this.http.post<BlogRow[]>(this.BLOG_API, newPost).subscribe({
      next: (data) => {
        this.postsAll = (data || []).map((x) => this.hydrate(x));
        this.applyFilters();
        this.closeModal();
        this.showSuccess('THÊM BÀI VIẾT THÀNH CÔNG');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.toast('err', 'LỖI THÊM BÀI VIẾT');
        this.cdr.detectChanges();
      },
    });
  }

  toggleVisible(p: BlogRow): void {
    const newVal = !p.visible;
    const updateBody: any = { visible: newVal };

    // Nếu đang là bản nháp mà bật hiển thị -> Tự động chuyển thành 'published'
    if (newVal && p.status === 'draft') {
      updateBody.status = 'published';
      this.toast('ok', 'Bài viết đã được xuất bản');
    }

    this.http.put<BlogRow[]>(`${this.BLOG_API}/${p.id}`, updateBody).subscribe({
      next: (data) => {
        this.postsAll = (data || []).map((x) => this.hydrate(x));
        this.applyFilters();
        if (!updateBody.status) {
          this.toast('ok', newVal ? 'Đã bật hiển thị' : 'Đã tắt hiển thị');
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast('err', 'LỖI THAY ĐỔI HIỂN THỊ');
        this.cdr.detectChanges();
      },
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
        this.postsAll = (data || []).map((x) => this.hydrate(x));
        this.applyFilters();
        this.closeDelete();
        this.showSuccess('XÓA BÀI VIẾT THÀNH CÔNG');
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast('err', 'LỖI XÓA BÀI VIẾT');
        this.cdr.detectChanges();
      },
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
    this.toasts = [t, ...this.toasts];
    this.cdr.detectChanges();

    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.zone.run(() => {
          this.removeToast(t.id);
        });
      }, 1500);
    });
  }

  removeToast(id: string): void {
    const t = this.toasts.find((x) => x.id === id);
    if (!t || t.closing) return;

    t.closing = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x.id !== id);
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 400);
  }

  trackToast(index: number, t: ToastItem): string {
    return t.id;
  }

  private load(): void {
    this.http.get<BlogRow[]>(this.BLOG_API).subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.postsAll = data.map((x) => this.hydrate(x));
          this.computeStats();
          this.applyFilters();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Lỗi tải dữ liệu từ API:', err);
        this.postsAll = this.seed();
        this.computeStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
    });
  }

  private loadLocal(): void {
    // Không dùng LocalStorage để lưu bài viết nữa để tránh lỗi QuotaExceededError (do ảnh Base64 quá nặng)
    // Dữ liệu sẽ được lấy từ API hoặc seed mặc định
    return;
  }

  private persist(): void {
    // Đã gỡ bỏ lưu LocalStorage vì bài viết chứa ảnh Base64 gây tràn bộ nhớ trình duyệt
    // Dữ liệu hiện tại đã được lưu an toàn trong MongoDB
    try {
      localStorage.removeItem(this.LS_KEY); // Xóa dữ liệu cũ nếu có để giải phóng bộ nhớ
    } catch {}
  }

  private hydrate(x: any): BlogRow {
    return {
      id: String(x.id || x._id || `blog_${Date.now()}`),
      code: String(x.code || (x.id || x._id)?.toString().toUpperCase() || 'NG00000'),
      title: String(x.title || x.heading || ''),
      heading: String(x.heading || x.title || ''),
      headingColor: String(x.headingColor || '#305C33'),
      excerpt: String(x.excerpt || ''),
      content: String(x.content || ''),
      date: x.date || new Date().toLocaleDateString('en-GB'),
      image: String(x.image || AdminBlog.PLACEHOLDER_IMG),
      thumbnailImage: String(x.thumbnailImage || x.image || AdminBlog.PLACEHOLDER_IMG),
      images: Array.isArray(x.images)
        ? x.images.map((s: any) => String(s))
        : [String(x.image || '')].filter(Boolean),
      layoutType: String(
        x.layoutType || (Array.isArray(x.images) && x.images.length > 1 ? 'gallery' : 'single'),
      ),
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
    this.stats.published = this.postsAll.filter((p) => p.status === 'published').length;
    this.stats.draft = this.postsAll.filter((p) => p.status === 'draft').length;
  }

  private nextCode(): string {
    const nums = this.postsAll
      .map((p) => (p.code || '').replace(/\D/g, ''))
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);

    const max = nums.length ? Math.max(...nums) : 100;
    const next = max + 1;
    return 'NG' + String(next).padStart(5, '0');
  }

  private clearFileInput(): void {
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  private clearThumbInput(): void {
    if (this.thumbInput?.nativeElement) this.thumbInput.nativeElement.value = '';
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
