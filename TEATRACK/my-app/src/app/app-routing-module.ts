import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogList } from './Pages/blog/blog-list/blog-list'
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail'

const routes: Routes = [
  { path: '', redirectTo: 'blog', pathMatch: 'full' },
  { path: "blog", component: BlogList },
  { path: "blog/:id", component: BlogDetail },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
