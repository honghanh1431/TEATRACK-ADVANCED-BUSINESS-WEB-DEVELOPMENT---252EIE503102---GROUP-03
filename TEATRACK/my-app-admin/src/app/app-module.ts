import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PageHeaderAdmin } from './Components/page-header/page-header-admin';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';
import { AdminAccount } from './Pages/Admin/admin-account/admin-account';
import { AdminProfile } from './Pages/Admin/admin-profile/admin-profile';

@NgModule({
  declarations: [
    App,
    Pagenotfound,
    AdminAccount,
    AdminProfile
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    PageHeaderAdmin
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
