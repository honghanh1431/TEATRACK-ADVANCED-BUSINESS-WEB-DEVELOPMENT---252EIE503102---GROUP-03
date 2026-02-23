import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';
import { Aboutus } from './Pages/aboutus/aboutus';
import { Cart } from './Pages/cart/cart';

const routes: Routes = [
  { path: '', redirectTo: 'blog', pathMatch: 'full' },
  { path: "blog", component: BlogList },
  { path: "blog/:id", component: BlogDetail },
  { path: "menu", component: Menu },
  {path:"aboutus",component:Aboutus},
  {path:"cart",component:Cart},
  
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
