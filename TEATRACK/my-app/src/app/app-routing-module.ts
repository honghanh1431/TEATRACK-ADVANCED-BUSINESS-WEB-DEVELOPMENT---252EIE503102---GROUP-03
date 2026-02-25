import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';
import { Homepage } from './Pages/homepage/homepage';

export { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';

const routes: Routes = [
  { path: '', redirectTo: 'blog', pathMatch: 'full' },
  { path: '', redirectTo: 'homepage', pathMatch: 'full' },
  { path: "blog", component: BlogList },
  { path: "blog/:id", component: BlogDetail },
  { path: "menu", component: Menu },
  { path: "homepage", component: Homepage},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'top',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule { }
