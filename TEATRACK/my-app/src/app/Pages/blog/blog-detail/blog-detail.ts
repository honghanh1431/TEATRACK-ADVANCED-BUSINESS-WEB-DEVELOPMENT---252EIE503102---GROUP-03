import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BLOG_DATA, RELATED_BLOGS } from '../blog-data';
import { APP_TITLE_SUFFIX } from '../../../route-titles';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-detail.html',
  styleUrls: ['../blog.css', '../../../../styles.css'],
})
export class BlogDetail implements OnInit {
  blogId: string = '';
  blog: any;
  relatedBlogs: any[] = [];
  relatedIndex = 0;
  get canPrevRelated(): boolean {
    return this.relatedIndex > 0;
  }
  get canNextRelated(): boolean {
    return this.relatedIndex + 3 < this.relatedBlogs.length;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Lắng nghe thay đổi ID trên URL (khi click bài liên quan vẫn dùng cùng component)
    this.route.paramMap.subscribe(params => {
      this.blogId = params.get('id') || '';
      this.loadBlog();
    });
  }

  /** Cuộn mượt lên đầu trang (dùng cho breadcrumb links) */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Khi click bài viết liên quan
  openBlog(id: string) {
    this.router.navigate(['/blog', id]).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.cdr.detectChanges();
    });
  }
  /** Cuộn trái: chỉ khi còn chỗ (không wrap) */
  prevRelated() {
    if (this.relatedIndex <= 0) return;
    this.relatedIndex--;
  }

  /** Cuộn phải: chỉ khi còn chỗ (không wrap) */
  nextRelated() {
    if (this.relatedIndex + 3 >= this.relatedBlogs.length) return;
    this.relatedIndex++;
  }
  /** Related timepill: "X tháng trước" hoặc "X năm trước" (nếu >= 1 năm) từ ngày đăng */
  formatRelatedDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    const parsed = this.parseBlogDate(dateStr);
    if (!parsed) return dateStr;
    const now = new Date();
    const months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
    if (months >= 12) {
      const years = Math.floor(months / 12);
      if (years === 1) return '1 năm trước';
      return `${years} năm trước`;
    }
    if (months <= 0) return 'Dưới 1 tháng trước';
    if (months === 1) return '1 tháng trước';
    return `${months} tháng trước`;
  }

  private parseBlogDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const s = dateStr.trim();
    // Dạng "13-15/06/2025"
    const rangeMatch = s.match(/^\d+-(\d+)\/(\d{1,2})\/(\d{4})$/);
    if (rangeMatch) {
      const [, day, month, year] = rangeMatch;
      return new Date(+year, +month - 1, +day);
    }
    // Dạng "31/12/2025 – 01/01/2026" (khoảng ngày, lấy ngày đầu)
    const rangeDashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[–\-]\s*\d{1,2}\/\d{1,2}\/\d{4}$/);
    if (rangeDashMatch) {
      const [, day, month, year] = rangeDashMatch;
      return new Date(+year, +month - 1, +day);
    }
    // Dạng "20/01/2026" hoặc "08/11/2025"
    const singleMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (singleMatch) {
      const [, day, month, year] = singleMatch;
      return new Date(+year, +month - 1, +day);
    }
    return null;
  }

  normSrc(path?: string): string {
    if (!path) return 'assets/icons/menu.png';
    const s = String(path);
    if (s.startsWith('http') || s.startsWith('data:')) return s;
    if (s.startsWith('assets/')) return s;
    if (s.startsWith('/assets/')) return s.slice(1);
    return 'assets/images/products/' + s.replace(/^\/+/, '').replace(/^assets\/+/, '');
  }

  private loadBlog() {
    this.http.get<any>(`https://teatrack-advanced-business-web.onrender.com/blog/${this.blogId}`).subscribe({
      next: (data) => {
        this.blog = data;
        if (this.blog && this.blog.title) {
          this.titleService.setTitle(`${this.blog.title} | ${APP_TITLE_SUFFIX}`);
        }
        // Increment view count
        this.http.post(`https://teatrack-advanced-business-web.onrender.com/blog/${this.blogId}/view`, {}).subscribe({
          next: (updated) => {
            if (updated && (updated as any).views) {
              this.blog.views = (updated as any).views;
            }
          },
          error: (err) => console.error('Increment view error:', err)
        });
        this.loadRelated();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Load blog error:', err);
        // Fallback
        this.blog = (BLOG_DATA as any)[this.blogId];
        if (!this.blog) {
          this.blog = {
            heading: 'Blog không tồn tại',
            content: '<p>Xin lỗi, blog này không tồn tại hoặc đã bị xóa.</p>',
            headingColor: '#D33'
          };
          this.relatedBlogs = [];
          this.titleService.setTitle(`Blog không tồn tại | ${APP_TITLE_SUFFIX}`);
        } else {
          if (this.blog.title) {
            this.titleService.setTitle(`${this.blog.title} | ${APP_TITLE_SUFFIX}`);
          }
          this.loadRelated();
        }
        this.cdr.detectChanges();
      }
    });
  }

  private shuffleAndTake<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  /** Chuẩn hóa item từ API thành dạng có title, description, image, date cho related card */
  private toRelatedItem(b: any): any {
    return {
      id: b.id,
      title: b.title || b.heading || '',
      image: b.thumbnailImage || b.image,
      date: b.date || ''
    };
  }

  private loadRelated() {
    this.http.get<any[]>('https://teatrack-advanced-business-web.onrender.com/blog').subscribe({
      next: (data) => {
        const others = (data || [])
          .filter(b => b.id !== this.blogId && b.visible !== false)
          .map(b => this.toRelatedItem(b));
        this.relatedBlogs = this.shuffleAndTake(others, 6);
        this.relatedIndex = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        const others = RELATED_BLOGS.filter(b => b.id !== this.blogId);
        this.relatedBlogs = this.shuffleAndTake(others, 6);
        this.relatedIndex = 0;
        this.cdr.detectChanges();
      }
    });
  }
}