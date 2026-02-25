import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pagenotfound',
  standalone: false,
  templateUrl: './pagenotfound.html',
  styleUrl: './pagenotfound.css',
})
export class Pagenotfound {
  constructor(private router: Router) {}

  goHome(){
    this.router.navigate(['/']);
  }
}
