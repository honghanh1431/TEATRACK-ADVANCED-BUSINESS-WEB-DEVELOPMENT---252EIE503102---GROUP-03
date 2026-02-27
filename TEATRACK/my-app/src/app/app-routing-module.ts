import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';
import { Homepage } from './Pages/homepage/homepage';
import { Product } from './Pages/product/product';
import { Aboutus } from './Pages/aboutus/aboutus';
import { Login } from './Pages/login/login';
import { Registion } from './Pages/registion/registion';
import { Cart } from './Pages/cart/cart';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';

export { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';

const routes: Routes = [
  { path: '', component: Homepage, pathMatch: 'full' },
  { path: '', component: Homepage },
  { path: 'blog', component: BlogList },
  { path: 'blog/:id', component: BlogDetail },
  { path: 'menu', component: Menu },
  { path: 'product', component: Product },
  { path: 'menu/product/:id/:name', component: Product },
  { path: 'aboutus', component: Aboutus },
  { path: 'login', component: Login, data: { isAdmin: false } },
  { path: 'login-admin', component: Login, data: { isAdmin: true } },
  { path: 'register', component: Registion },
  { path: 'cart', component: Cart },
  { path: '404', component: Pagenotfound },
  { path: '**', redirectTo: '404', pathMatch: 'full' },
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
