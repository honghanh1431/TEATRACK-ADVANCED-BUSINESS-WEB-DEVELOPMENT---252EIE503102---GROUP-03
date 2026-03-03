import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  contactForm: FormGroup;
  showSuccessModal = false;

  scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  branches = [
    'Đường số 8, Linh Xuân, Thủ Đức',
    '20 Nguyễn An Ninh, KP Nhị Đồng 2, Dĩ An',
    '3-24 Lý Thường Kiệt, TX Dĩ An'
  ];

  topics = [
    { value: 'complain', label: 'Than phiền' },
    { value: 'praise',   label: 'Khen ngợi'  },
    { value: 'issued',   label: 'Đề xuất'    },
    { value: 'other',    label: 'Vấn đề khác'}
  ];

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      fullname: ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      phone:    ['', Validators.required],
      branch:   ['', Validators.required],
      topic:    ['', Validators.required],
      content:  ['', Validators.required]
    });
  }

  // Getter tiện lợi để truy cập controls trong template
  get f() { return this.contactForm.controls; }

  onSubmit() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    console.log(this.contactForm.value);
    this.contactForm.reset();
    this.showSuccessModal = true;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }
}
