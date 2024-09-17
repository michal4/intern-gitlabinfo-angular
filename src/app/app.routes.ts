// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {DetailsPageComponent} from "../components/details-page/details-page.component";
import {AppComponent} from "./app.component";

export const routes: Routes = [
  { path: '/', component: AppComponent },
  { path: 'project/:id', component: DetailsPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
