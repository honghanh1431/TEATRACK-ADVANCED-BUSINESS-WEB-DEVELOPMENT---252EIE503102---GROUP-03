import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule} from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { PageFooter } from './Components/page-footer/page-footer';
import { PageHeader } from './Components/page-header/page-header';
import { Blog } from './Pages/blog/blog';
import { BlogList } from './Pages/blog/blog-list/blog-list';
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail';
import { Menu } from './Pages/menu/menu';
<<<<<<< HEAD
import { Product } from './Pages/product/product';
=======
import { Aboutus } from './Pages/aboutus/aboutus';
import { Cart } from './Pages/cart/cart';
>>>>>>> 3e328156c70e74cf227727e6f825c8e3d54f0321

@NgModule({
  declarations: [
    App,
    Blog,
    Menu,
<<<<<<< HEAD
    Product
=======
    Aboutus,
    Cart,
>>>>>>> 3e328156c70e74cf227727e6f825c8e3d54f0321
  ],
  imports: [
    BrowserModule,
    PageFooter,
    PageHeader,
    BlogList,
    BlogDetail,
    CommonModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
