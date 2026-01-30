import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BLOG_DATA } from '../blog-data';

const PAGE_SIZE = 8;

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
  pageNumbers: number[] = [];

  constructor(private router: Router) {}

  /** Cuộn mượt lên đầu trang (dùng cho breadcrumb links) */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit() {
    this.blogsArray = Object.keys(BLOG_DATA).map(
      key => ({
        id: key,
        ...(BLOG_DATA as Record<string, any>)[key]
      })
    );
    this.totalPages = Math.max(1, Math.ceil(this.blogsArray.length / PAGE_SIZE));
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updateDisplayedBlogs();
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