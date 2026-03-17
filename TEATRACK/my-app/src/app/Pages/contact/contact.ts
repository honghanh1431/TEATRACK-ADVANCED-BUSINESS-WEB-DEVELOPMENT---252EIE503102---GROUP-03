import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements OnInit {
  contactForm: FormGroup;
  showSuccessModal = false;

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

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.contactForm = this.fb.group({
      fullname: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      phone:    ['', Validators.required],
      branch:   ['', Validators.required],
      topic:    ['', Validators.required],
      content:  ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.http.get<any[]>('http://localhost:3002/api/agencies').subscribe({
      next: (data) => {
        if (data && data.length) {
          this.branches = data.map(a => a.name);
        } else {
          // fallback
          this.branches = [
            '244 đường số 8 - H071',
            'Bình Dương - BD01'
          ];
        }
      },
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
