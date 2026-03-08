import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  title = 'my-app-admin';
  showLayout = true;

  constructor(private router: Router, private titleService: Title) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects || event.url;
      const hideOn = ['/login', '/404'];
      const hide = hideOn.some(path => url.includes(path));
      this.showLayout = !hide;

      const path = url.split('?')[0];
      const pageTitle = ROUTE_TITLES[path];
      const full = pageTitle ? `${pageTitle} | ${APP_TITLE_SUFFIX}` : APP_TITLE_SUFFIX;
      this.titleService.setTitle(full);
    });
  }
}

