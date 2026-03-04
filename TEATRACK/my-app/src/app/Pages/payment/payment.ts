import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
})
export class Payment implements OnInit {
  @Input() method: string = 'momo';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.queryParamMap.get('method');
    if (fromRoute) this.method = fromRoute;
  }
}
