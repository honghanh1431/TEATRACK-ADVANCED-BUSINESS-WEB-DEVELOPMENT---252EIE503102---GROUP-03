import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class Admin implements AfterViewInit {
  ngAfterViewInit(): void {
    // nạp script dashboard (nếu chưa có)
    const existing = document.querySelector('script[data-admin-dashboard]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = '/assets/admin-dashboard.js';
      s.async = false;
      s.defer = true;
      s.setAttribute('data-admin-dashboard', '1');
      document.body.appendChild(s);
    }
  }
}

