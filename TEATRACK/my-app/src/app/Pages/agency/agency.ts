import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-agency',
  standalone: false,
  templateUrl: './agency.html',
  styleUrls: ['./agency.css'],
})
export class Agency implements OnInit, AfterViewInit, OnDestroy {
  agencies: any[] = [];
  activeAgency: any = null;
  mapIframeSrc: SafeResourceUrl | null = null;
  private socket: Socket | undefined;

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef, 
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {
    this.socket = io('http://localhost:3002');
    this.socket.on('agencyUpdated', (data) => {
      this.ngZone.run(() => {
        this.processAgencies(data);
      });
    });
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3002/api/agencies').subscribe({
      next: (data) => this.processAgencies(data),
      error: (err) => console.error('Failed to load agencies:', err)
    });
  }

  processAgencies(data: any[]): void {
    // Chỉ hiện chi nhánh 'active' hoặc không có status (mặc định active)
    this.agencies = (data || []).filter(a => a.status === 'active' || !a.status);
    
    // Nếu activeAgency hiện tại bị deactivate hoặc không còn tồn tại, chọn cái đầu tiên
    const stillExists = this.agencies.find(a => 
      (a._id && this.activeAgency?._id && a._id === this.activeAgency._id) || 
      (a.id && this.activeAgency?.id && a.id === this.activeAgency.id)
    );

    if (!stillExists && this.agencies.length > 0) {
      this.activeAgency = this.agencies[0];
      this.mapIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.activeAgency.mapEmbed || '');
    } else if (this.agencies.length === 0) {
      this.activeAgency = null;
      this.mapIframeSrc = null;
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
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

