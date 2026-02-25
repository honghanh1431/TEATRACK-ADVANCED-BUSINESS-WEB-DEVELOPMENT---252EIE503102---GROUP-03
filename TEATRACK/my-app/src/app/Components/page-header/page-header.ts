import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader implements OnInit, AfterViewInit {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    public router: Router
  ) {}

  /** True khi đang ở /menu hoặc /product (chi tiết sản phẩm) → hiện underline "Menu thức uống" */
  get isMenuOrProductActive(): boolean {
    const path = this.router.url.split('?')[0];
    return path.startsWith('/menu') || path.startsWith('/product');
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initAdminHeaderLogic();
  }

  private initAdminHeaderLogic() {
    const currentPath = window.location.pathname;
    const isAdminPage =
      currentPath.includes('admin-dashboard') || currentPath.includes('Admin.html');
    const isAccountPage = currentPath.includes('admin-account');
    const isOrderPage = currentPath.includes('admin-order');

    // 🟢 Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      this.renderer.listen(btnLogout, 'click', (e: Event) => {
        e.preventDefault();
        const confirmMsg =
          (document.querySelector('[data-i18n="header.admin.logoutConfirm"]')?.textContent as string) ||
          'Bạn có chắc muốn đăng xuất?';
        if (confirm(confirmMsg)) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('ngogia_user');
          window.location.href = '/admin-login';
        }
      });
    }

    // 🟢 User menu toggle
    const userBtn = document.getElementById('user-btn');
    const userMenu = document.getElementById('user-menu');
    const userBox = document.getElementById('user-box');

    if (userBtn && userMenu) {
      this.renderer.listen(userBtn, 'click', (e: Event) => {
        e.stopPropagation();
        const isExpanded = userBtn.getAttribute('aria-expanded') === 'true';
        userBtn.setAttribute('aria-expanded', String(!isExpanded));
        (userMenu as HTMLElement).hidden = isExpanded;
      });

      // Ẩn khi click ra ngoài
      this.renderer.listen(document, 'click', (e: Event) => {
        if (userBox && !userBox.contains(e.target as Node)) {
          userBtn.setAttribute('aria-expanded', 'false');
          (userMenu as HTMLElement).hidden = true;
        }
      });
    }

    // 🟢 Navigation logic + active state: chỉ chạy trên trang admin (trang chủ dùng routerLink, không gắn listener)
    if (isAdminPage) {
      document.querySelectorAll('.nav-bar .nav-item').forEach((item) => {
        const action = item.getAttribute('data-action');
        const target = item.getAttribute('data-target');
        const href = item.getAttribute('href');

        this.renderer.listen(item, 'click', (e: Event) => {
          if (action === 'navigate') return;
          if (action === 'scroll') {
            e.preventDefault();
            const targetSection = document.getElementById(target || '');
            if (targetSection) {
              const headerHeight = 80;
              window.scrollTo({
                top: targetSection.offsetTop - headerHeight,
                behavior: 'smooth'
              });
              document.querySelectorAll('.nav-bar .nav-item').forEach((i) => i.classList.remove('active'));
              item.classList.add('active');
            } else {
              window.location.href = `/admin-dashboard#${target}`;
            }
          }
        });
      });

      document.querySelectorAll('.nav-bar .nav-item').forEach((item) => {
        const target = item.getAttribute('data-target');
        const href = item.getAttribute('href');
        if (isAccountPage && href?.includes('admin-account')) item.classList.add('active');
        if (isOrderPage && href?.includes('admin-order')) item.classList.add('active');
        if (isAdminPage) {
          const hash = window.location.hash.replace('#', '');
          if (hash && hash === target) item.classList.add('active');
          else if (!hash && item.querySelector('[data-i18n="header.admin.overview"]')) item.classList.add('active');
        }
      });
    }

    // 🟢 Handle hash change for scroll sections
    if (isAdminPage) {
      this.renderer.listen(window, 'hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        const targetSection = document.getElementById(hash);
        
        if (targetSection) {
          const headerHeight = 80;
          const targetPosition = targetSection.offsetTop - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update active state
          document.querySelectorAll('.nav-bar .nav-item').forEach((item) => {
            const target = item.getAttribute('data-target');
            if (target === hash) {
              item.classList.add('active');
            } else {
              item.classList.remove('active');
            }
          });
        }
      });

      // 🟢 Trigger scroll on page load if hash exists
      const initialHash = window.location.hash.replace('#', '');
      if (initialHash) {
        setTimeout(() => {
          const targetSection = document.getElementById(initialHash);
          if (targetSection) {
            const headerHeight = 80;
            const targetPosition = targetSection.offsetTop - headerHeight;
            
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }, 500);
      }
    }

    // 🟢 Lắng nghe sự kiện đổi ngôn ngữ từ trang admin-account
    this.renderer.listen(window, 'storage', (e: StorageEvent) => {
      if (
        e.key === 'app.lang' &&
        typeof (window as any).reloadTranslations === 'function'
      ) {
        const newLang = e.newValue || 'vi';
        (window as any).reloadTranslations(newLang);
      }
    });

    // 🟢 Load translations ngay khi header load
    if (typeof (window as any).reloadTranslations === 'function') {
      const savedLang = localStorage.getItem('app.lang') || 'vi';
      (window as any).reloadTranslations(savedLang);
    }

    console.log('✅ Header navigation initialized');
    console.log('Current page:', isAdminPage ? 'Admin Dashboard' : isOrderPage ? 'Order Page' : 'Other');
  }
}