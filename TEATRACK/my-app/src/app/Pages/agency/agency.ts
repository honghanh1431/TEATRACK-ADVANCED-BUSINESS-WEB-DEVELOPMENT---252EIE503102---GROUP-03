import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-agency',
  standalone: false,
  templateUrl: './agency.html',
  styleUrls: ['./agency.css'],
})
export class Agency implements AfterViewInit {
  ngAfterViewInit(): void {
    // Khi click vào card → đổi src của iframe sang URL embed tương ứng
    const cards = document.querySelectorAll<HTMLElement>('.branch-card');
    const iframe = document.getElementById('branchMap') as
      | (HTMLIFrameElement & { dataset: DOMStringMap & { open?: string } })
      | null;

    cards.forEach((card) => {
      card.addEventListener('click', () => {
        // active style
        cards.forEach((c) => c.classList.remove('is-active'));
        card.classList.add('is-active');

        const url = card.dataset['embed'];
        if (iframe && url) {
          iframe.src = url;
          // Lưu url mở tab mới (chuyển từ /embed? → /)
          iframe.dataset.open = url.replace('/embed?', '/');
        }
      });
    });

    // Click vào bản đồ → mở Google Maps ngoài tab mới
    iframe?.addEventListener('click', (e) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLIFrameElement & {
        dataset: DOMStringMap & { open?: string };
      };
      const openUrl =
        target.dataset.open || target.src.replace('/embed?', '/');
      // Phòng trường hợp URL không chuyển được, vẫn fallback dùng src
      window.open(openUrl || target.src, '_blank', 'noopener');
    });
  }
}

