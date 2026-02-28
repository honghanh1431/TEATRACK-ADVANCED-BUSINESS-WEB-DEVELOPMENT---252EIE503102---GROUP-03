import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClientModule} from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { PageFooter } from './Components/page-footer/page-footer';
import { PageHeader } from './Components/page-header/page-header';
import { PageHeader2 } from './Components/page-header/page-header-2';
import { PageHeaderAdmin } from './Components/page-header/page-header-admin';
import { Blog } from './Pages/blog/blog';
import { BlogList } from './Pages/blog/blog-list/blog-list';
import { BlogDetail } from './Pages/blog/blog-detail/blog-detail';
import { Menu } from './Pages/menu/menu';
import { Homepage } from './Pages/homepage/homepage'
import { Product } from './Pages/product/product';
import { Aboutus } from './Pages/aboutus/aboutus';
import { Cart } from './Pages/cart/cart';
export { ROUTE_TITLES, APP_TITLE_SUFFIX } from './route-titles';
import { Login } from './Pages/login/login';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';
import { AdminBlog } from './Pages/Admin/admin-blog/admin-blog';
import { Registion } from './Pages/registion/registion';
import { Agency } from './Pages/agency/agency';
import { Admin } from './Pages/Admin/admin';
import { OrderTracking } from './Pages/order-tracking/order-tracking';

@NgModule({
  declarations: [
    App,
    Blog,
    Menu,
    Product,
    Aboutus,
    Pagenotfound,
    Registion,
    Agency,
    Admin,
  ],
  
  schemas: [CUSTOM_ELEMENTS_SCHEMA],

  imports: [
    BrowserModule,
    PageFooter,
    PageHeader,
    PageHeader2,
    PageHeaderAdmin,
    BlogList,
    BlogDetail,
    CommonModule,
    DecimalPipe,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule,
    Homepage,
    Login,
    AdminBlog,
    Cart,
    OrderTracking,
  ],

  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
