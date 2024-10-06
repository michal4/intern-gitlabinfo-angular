// app-routing.module.ts
import {Routes} from '@angular/router';
import {ProjectComponent} from "../view/project/project.component";

export const APP_ROUTES: Routes = [
  {path: '', redirectTo: 'gitlab-projects', pathMatch: 'full'},
  {
    path: "gitlab-projects",
    loadComponent: () => import("../view/projects/projects.component")
      .then((m) => m.ProjectsComponent),
  },
  {
    path: "branches",
    loadComponent: () => import("../view/branches/branches.component")
      .then((m) => m.BranchesComponent),
  },
  {path: 'gitlab-project/:id', component: ProjectComponent}
];
