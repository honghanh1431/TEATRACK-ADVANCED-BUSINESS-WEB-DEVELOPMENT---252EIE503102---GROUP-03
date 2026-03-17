import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-agency',
  standalone: false,
  templateUrl: './agency.html',
  styleUrls: ['./agency.css'],
})
export class Agency implements OnInit, AfterViewInit {
  agencies: any[] = [];
  activeAgency: any = null;
  mapIframeSrc: SafeResourceUrl | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3002/api/agencies').subscribe({
      next: (data) => {
        this.agencies = data || [];
        if (this.agencies.length > 0) {
          this.activeAgency = this.agencies[0];
          this.mapIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.activeAgency.mapEmbed || '');
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load agencies:', err)
    });
  }

  selectAgency(agency: any): void {
    this.activeAgency = agency;
    if (agency.mapEmbed) {
      this.mapIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(agency.mapEmbed);
    }
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    const iframe = document.getElementById('branchMap') as HTMLIFrameElement | null;
    if (!iframe) return;

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

