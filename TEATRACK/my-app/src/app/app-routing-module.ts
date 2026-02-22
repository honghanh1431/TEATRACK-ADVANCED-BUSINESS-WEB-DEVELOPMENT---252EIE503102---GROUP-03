import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'
import { Menu } from './Pages/menu/menu';

const routes: Routes = [
  { path: '', redirectTo: 'blog', pathMatch: 'full' },
  { path: "blog", component: BlogList },
  { path: "blog/:id", component: BlogDetail },
  { path: "menu", component: Menu },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
