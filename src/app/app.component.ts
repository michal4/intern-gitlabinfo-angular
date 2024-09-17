import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DropdownCheckboxComponent} from "../components/dropdown-checkbox/dropdown-checkbox.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [RouterOutlet, DropdownCheckboxComponent]
})
export class AppComponent {
  title = 'intern-gitlabinfo-angular';
}
