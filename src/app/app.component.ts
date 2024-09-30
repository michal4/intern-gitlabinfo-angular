import {Component} from '@angular/core';
import packageJson from '../../package.json';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterModule]
})
export class AppComponent {
  title = 'intern-gitlabinfo-angular';
  appVersion: string = packageJson.version;
}
