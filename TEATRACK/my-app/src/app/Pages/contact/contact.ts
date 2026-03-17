import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements OnInit, OnDestroy {
  contactForm: FormGroup;
  showSuccessModal = false;
  private socket: Socket | undefined;

  scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  branches: string[] = [];

  topics = [
    { value: 'complain', label: 'Than phiền' },
    { value: 'praise',   label: 'Khen ngợi'  },
    { value: 'issued',   label: 'Đề xuất'    },
    { value: 'other',    label: 'Vấn đề khác'}
  ];

  constructor(private fb: FormBuilder, private http: HttpClient, private ngZone: NgZone) {
    this.contactForm = this.fb.group({
      fullname: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      phone:    ['', Validators.required],
      branch:   ['', Validators.required],
      topic:    ['', Validators.required],
      content:  ['', Validators.required]
    });

    this.socket = io('http://localhost:3002');
    this.socket.on('agencyUpdated', (data) => {
      this.ngZone.run(() => {
        this.processAgencies(data);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  processAgencies(data: any[]): void {
    if (data && data.length) {
      // Chỉ lấy chi nhánh đang hoạt động
      this.branches = data
        .filter(a => a.status === 'active' || !a.status)
        .map(a => a.name);
    } else {
      // fallback
      this.branches = [
        '244 đường số 8 - H071',
        'Bình Dương - BD01'
      ];
    }
  }

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3002/api/agencies').subscribe({
      next: (data) => this.processAgencies(data),
      error: (err) => {
        console.error('Failed to load agencies in contact:', err);
        this.branches = [
          '244 đường số 8 - H071',
          'Bình Dương - BD01'
        ];
      }
    });
  }

  // Getter tiện lợi để truy cập controls trong template
  get f() { return this.contactForm.controls; }

  onSubmit() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    
    this.http.post('http://localhost:3002/api/contacts', this.contactForm.value).subscribe({
      next: () => {
        console.log('Feedback submitted:', this.contactForm.value);
        this.contactForm.reset();
        this.showSuccessModal = true;
      },
      error: (err) => {
        console.error('Submit feedback error:', err);
        alert('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại sau.');
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }
}
