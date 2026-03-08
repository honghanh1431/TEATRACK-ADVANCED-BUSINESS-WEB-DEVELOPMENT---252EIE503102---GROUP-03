import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BLOG_DATA } from '../blog-data';
import { APP_TITLE_SUFFIX } from '../../../route-titles';

const PAGE_SIZE = 8;
/** Pagination chỉ hiển thị tối đa 5 số, sau đó là dấu ... */
const PAGINATION_VISIBLE = 5;

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-list.html',
  styleUrls: ['../blog.css', '../../../../styles.css'],
})
export class BlogList implements OnInit {
  blogsArray: any[] = [];
  displayedBlogs: any[] = [];
  currentPage = 1;
  totalPages = 1;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) { }

  /** Chỉ hiển thị tối đa 5 số trang, trượt theo currentPage. */
  get visiblePageNumbers(): number[] {
    const n = PAGINATION_VISIBLE;
    const total = this.totalPages;
    if (total <= n) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.floor((this.currentPage - 1) / n) * n + 1;
    const end = Math.min(start + n - 1, total);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  /** Hiện "..." chỉ khi còn trang sau cửa sổ 5 số. */
  get showEllipsisAfter(): boolean {
    if (this.totalPages <= PAGINATION_VISIBLE) return false;
    const n = PAGINATION_VISIBLE;
    const start = Math.floor((this.currentPage - 1) / n) * n + 1;
    const end = Math.min(start + n - 1, this.totalPages);
    return end < this.totalPages;
  }

  /** Cuộn mượt lên đầu trang (dùng cho breadcrumb links) */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit() {
    this.titleService.setTitle(`Diễn đàn | ${APP_TITLE_SUFFIX}`);
    this.http.get<any[]>('http://localhost:3002/blog').subscribe({
      next: (data) => {
        this.blogsArray = (data || []).filter(b => b.visible !== false);
        this.totalPages = Math.max(1, Math.ceil(this.blogsArray.length / PAGE_SIZE));
        this.updateDisplayedBlogs();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch blogs error:', err);
        // Fallback to local data
        this.blogsArray = Object.keys(BLOG_DATA).map(
          key => ({
            id: key,
            ...(BLOG_DATA as Record<string, any>)[key]
          })
        );
        this.totalPages = Math.max(1, Math.ceil(this.blogsArray.length / PAGE_SIZE));
        this.updateDisplayedBlogs();
        this.cdr.detectChanges();
      }
    });
  }

  normSrc(path?: string): string {
    if (!path) return 'assets/icons/menu.png';
    const s = String(path);
    if (s.startsWith('http') || s.startsWith('data:')) return s;
    if (s.startsWith('assets/')) return s;
    if (s.startsWith('/assets/')) return s.slice(1);
    return 'assets/images/products/' + s.replace(/^\/+/, '').replace(/^assets\/+/, '');
  }

  private updateDisplayedBlogs() {
    const start = (this.currentPage - 1) * PAGE_SIZE;
    this.displayedBlogs = this.blogsArray.slice(start, start + PAGE_SIZE);
  }

  /** Bỏ <br/> trong heading để hiển thị 1 dòng trên blog list */
  headingOneLine(heading: string): string {
    return (heading || '').replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    // "13-15/06/2025" -> "13-15.06.25", "20/10/2025" -> "20.10.25"
    const m = dateStr.match(/^(\d+(?:-\d+)?)\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const year = m[3].slice(-2);
      return `${m[1]}.${m[2].padStart(2, '0')}.${year}`;
    }
    return dateStr;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedBlogs();
  }

  prevPage() {
    this.goToPage(this.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  openDetail(id: string) {
    this.router.navigate(['/blog', id]);
  }
}