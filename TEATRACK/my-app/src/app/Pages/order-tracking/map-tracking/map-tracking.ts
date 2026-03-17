import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

const AGENCIES_URL = '/data/agencies.json';

@Component({
  selector: 'app-map-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-tracking.html',
  styleUrls: ['./map-tracking.css'],
})
export class MapTracking implements OnInit, OnChanges {
  @Input() order: any = null;

  agencies: { name: string; mapEmbed?: string; address?: string }[] = [];
  selectedEmbed: SafeResourceUrl | null = null;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAgencies();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && this.order) {
      this.pickEmbedFromOrder();
      this.cdr.detectChanges();
    }
  }

  private loadAgencies(): void {
    this.http.get<{ name: string; mapEmbed?: string; address?: string }[]>(AGENCIES_URL).subscribe({
      next: (list) => {
        this.agencies = Array.isArray(list) ? list : [];
        this.pickEmbedFromOrder();
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Không tải được danh sách chi nhánh.';
        this.cdr.detectChanges();
      },
    });
  }

  private pickEmbedFromOrder(): void {
    this.selectedEmbed = null;
    const chosen = (this.order?.deliveryAgency || '').trim();
    if (!chosen || !this.agencies.length) return;

    const chosenLower = chosen.toLowerCase();
    const found = this.agencies.find((a) => {
      const name = (a.name || '').trim().toLowerCase();
      return name === chosenLower || chosenLower.includes(name) || name.includes(chosenLower);
    });

    if (found?.mapEmbed) {
      this.selectedEmbed = this.sanitizer.bypassSecurityTrustResourceUrl(found.mapEmbed);
    } else {
      this.selectedEmbed = this.sanitizer.bypassSecurityTrustResourceUrl(this.agencies[0].mapEmbed || '');
    }
    this.cdr.detectChanges();
  }
}
