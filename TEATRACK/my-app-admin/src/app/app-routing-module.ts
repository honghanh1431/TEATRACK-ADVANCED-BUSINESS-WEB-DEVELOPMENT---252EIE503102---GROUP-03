import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Admin } from './Pages/Admin/admin';
import { Login } from './Pages/login/login';
import { AdminBlog } from './Pages/Admin/admin-blog/admin-blog';
import { AdminOrder } from './Pages/Admin/admin-order/admin-order';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'admin-dashboard', component: Admin },
  { path: 'admin/blog', component: AdminBlog },
  { path: 'admin/order', component: AdminOrder },
  { path: '404', component: Pagenotfound },
  { path: '**', redirectTo: '404', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
