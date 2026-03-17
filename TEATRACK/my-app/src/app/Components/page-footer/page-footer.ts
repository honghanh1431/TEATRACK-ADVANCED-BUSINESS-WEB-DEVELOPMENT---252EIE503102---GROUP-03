import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, Renderer2, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-page-footer',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './page-footer.html',
  styleUrl: './page-footer.css',
})
export class PageFooter implements OnInit, AfterViewInit, OnDestroy {
  agencies: any[] = [];
  private socket: Socket | undefined;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { 
    if (isPlatformBrowser(this.platformId)) {
      this.socket = io('http://localhost:3002');
      this.socket.on('agencyUpdated', (data) => {
        this.ngZone.run(() => {
          this.processAgencies(data);
        });
      });
    }
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  processAgencies(data: any[]): void {
    // Chỉ lấy chi nhánh đang hoạt động
    this.agencies = (data || []).filter(a => a.status === 'active' || !a.status);
    this.cdr.detectChanges();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<any[]>('http://localhost:3002/api/agencies').subscribe({
        next: (data) => this.processAgencies(data),
        error: (err) => console.warn('Footer agencies fetch error:', err)
      });
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onRegisterClick() {
    if (!isPlatformBrowser(this.platformId)) return;
    const emailEl = document.getElementById('subEmail') as HTMLInputElement | null;
    const formEl = document.getElementById('subForm') as HTMLFormElement | null;
    const modal = document.getElementById('sub-modal');
    if (!emailEl || !formEl || !modal) return;

    const v = emailEl.value.trim();
    const ok = /.+@.+\..+/.test(v);
    if (!ok) {
      emailEl.focus();
      emailEl.setAttribute('aria-invalid', 'true');
      return;
    }

    emailEl.setAttribute('aria-invalid', 'false');
    modal.removeAttribute('aria-hidden');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    formEl.reset();
    setTimeout(() => this.closeSubModal(), 2500);
  }

  /** Đóng modal đăng ký thành công */
  closeSubModal() {
    if (!isPlatformBrowser(this.platformId)) return;
    const modal = document.getElementById('sub-modal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const modal = document.getElementById('sub-modal');
    if (!modal) return;

    const closeModal = () => this.closeSubModal();

    const closeBtn = modal.querySelector('.sub-close');
    if (closeBtn) {
      this.renderer.listen(closeBtn, 'click', (e: Event) => {
        e.stopPropagation();
        closeModal();
      });
    }
    const backdrop = modal.querySelector('.sub-backdrop');
    if (backdrop) {
      this.renderer.listen(backdrop, 'click', (e: Event) => {
        e.stopPropagation();
        closeModal();
      });
    }
    this.renderer.listen(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });
  }
}
