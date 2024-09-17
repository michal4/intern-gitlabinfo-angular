import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {JsonPipe} from "@angular/common";
import {ProjectService} from "../../service/project.service";

@Component({
  selector: 'app-details-page',
  standalone: true,
  imports: [
    JsonPipe
  ],
  templateUrl: './details-page.component.html',
  styleUrl: './details-page.component.scss'
})
export class DetailsPageComponent implements OnInit {
  project: any;

  constructor(private route: ActivatedRoute, private projectService: ProjectService) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.projectService.getProjectById(id).subscribe(data => {
      this.project = data;
    });
  }
}
