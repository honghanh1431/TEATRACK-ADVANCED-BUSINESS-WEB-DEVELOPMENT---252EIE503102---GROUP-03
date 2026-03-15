import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderAdmin } from './Components/page-header/page-header-admin';
import { Pagenotfound } from './Pages/pagenotfound/pagenotfound';
import { AdminAccount } from './Pages/Admin/admin-account/admin-account';
import { AdminProfile } from './Pages/Admin/admin-profile/admin-profile';
import { AdminPromotion } from './Pages/Admin/admin-promotion/admin-promotion';
import { AdminAgency } from './Pages/Admin/admin-agency/admin-agency';
import { AdminContact } from './Pages/Admin/admin-contact/admin-contact';

@NgModule({
  declarations: [
    App,
    Pagenotfound,
    AdminAccount,
    AdminProfile,
    AdminAgency,
    AdminContact
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    FormsModule,
    PageHeaderAdmin,
    AdminPromotion
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
