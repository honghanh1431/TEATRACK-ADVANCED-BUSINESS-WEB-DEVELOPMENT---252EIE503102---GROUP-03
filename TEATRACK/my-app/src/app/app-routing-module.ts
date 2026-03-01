import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';
import { Homepage } from './Pages/homepage/homepage';
import { Product } from './Pages/product/product';
import { Aboutus } from './Pages/aboutus/aboutus';
import { Agency } from './Pages/agency/agency';
import { Admin } from './Pages/Admin/admin';
import { Login } from './Pages/login/login';
import { Registion } from './Pages/registion/registion';
import { Cart } from './Pages/cart/cart';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';
import { Payment } from './Pages/payment/payment';
import { Contact } from './Pages/contact/contact';
import { Profile } from './Pages/profile/profile';
import { AdminBlog } from './Pages/Admin/admin-blog/admin-blog';
import { OrderTracking } from './Pages/order-tracking/order-tracking';


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
  { path: 'agency', component: Agency },
  { path: 'admin-dashboard', component: Admin },
  { path: 'login', component: Login, data: { isAdmin: false } },
  { path: 'login-admin', component: Login, data: { isAdmin: true } },
  { path: 'register', component: Registion },
  { path: 'cart', component: Cart },
  { path: 'order-tracking', component: OrderTracking},
  { path: '404', component: Pagenotfound },
  { path: 'payment', component: Payment },
  { path: 'contact', component: Contact },
  { path: 'profile', component: Profile },
  { path: 'admin/blog', component: AdminBlog },
  { path: 'admin/blog', loadComponent: () => import('./Pages/Admin/admin-blog/admin-blog').then(m => m.AdminBlog) },
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
