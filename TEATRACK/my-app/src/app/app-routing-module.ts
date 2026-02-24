import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';
import { Product } from './Pages/product/product';
import { Aboutus } from './Pages/aboutus/aboutus';
<<<<<<< HEAD
import { Login } from './Pages/login/login';
=======
import { Cart } from './Pages/cart/cart';
>>>>>>> ac7a78cff68d6368999da5ed6f8c35ed719d9e90

export { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';

const routes: Routes = [
  { path: '', redirectTo: '/', pathMatch: 'full' },
  { path: 'blog', component: BlogList },
  { path: 'blog/:id', component: BlogDetail },
  { path: 'menu', component: Menu },
  { path: 'menu/product/:id/:name', component: Product },
  { path: 'aboutus', component: Aboutus },
<<<<<<< HEAD
  { path: 'login', component: Login, data: { isAdmin: false } },
  { path: 'login-admin', component: Login, data: { isAdmin: true } },
=======
  { path: 'cart',component:Cart},
>>>>>>> ac7a78cff68d6368999da5ed6f8c35ed719d9e90
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
