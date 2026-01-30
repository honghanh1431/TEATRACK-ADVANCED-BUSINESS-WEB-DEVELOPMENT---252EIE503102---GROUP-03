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

@NgModule({
  declarations: [
    App,
    Blog
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
