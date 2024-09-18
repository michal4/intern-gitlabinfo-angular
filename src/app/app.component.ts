import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProjectsComponent } from '../view/projects/projects.component';
import { ProjectDetailsComponent } from '../components/project-details/project-details.component';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'], // Fixed from `styleUrl` to `styleUrls`
  standalone: true,
  imports: [RouterOutlet, ProjectsComponent, ProjectDetailsComponent] // Import necessary components
})
export class AppComponent {
  title = 'intern-gitlabinfo-angular';
  appVersion: string = packageJson.version;
  restapiVersion: string = packageJson.dependencies["syntea-syndoc2-restapi-client"];
}
