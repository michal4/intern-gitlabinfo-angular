import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectComponent } from "../view/project/project.component";
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

export const APP_ROUTES: Routes = [
  { path: '', redirectTo: 'gitlab-projects', pathMatch: 'full' },
  {
    path: "gitlab-projects",
    loadComponent: () => import("../view/projects/projects.component")
      .then((m) => m.ProjectsComponent),
  },
  {
    path: "branches",
    loadComponent: () => import("../view/branches/branches.component")
      .then((m) => m.BranchesComponent),
      //     <- @hejny Some naming is meaningless and probably should be done better.
  },
  {
    path: "gitlab-project/:id",
    loadComponent: () => import("../view/project/project.component")
      .then((m) => m.ProjectComponent),
  },
  // { path: 'gitlab-project/:id', component: ProjectComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }],
  exports: [RouterModule]
})
export class AppRoutingModule { }
