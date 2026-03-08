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
    const rangeMatch = dateStr.match(/^\d+-(\d+)\/(\d{1,2})\/(\d{4})$/);
    if (rangeMatch) {
      const [, day, month, year] = rangeMatch;
      return new Date(+year, +month - 1, +day);
    }
    const singleMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
    this.http.get<any>(`http://localhost:3002/blog/${this.blogId}`).subscribe({
      next: (data) => {
        this.blog = data;
        if (this.blog && this.blog.title) {
          this.titleService.setTitle(`${this.blog.title} | ${APP_TITLE_SUFFIX}`);
        }
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

  private loadRelated() {
    this.http.get<any[]>('http://localhost:3002/blog').subscribe({
      next: (data) => {
        this.relatedBlogs = (data || [])
          .filter(b => b.id !== this.blogId && b.visible !== false)
          .slice(0, 6);
        this.relatedIndex = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.relatedBlogs = RELATED_BLOGS
          .filter(b => b.id !== this.blogId)
          .slice(0, 6);
        this.relatedIndex = 0;
        this.cdr.detectChanges();
      }
    });
  }
}