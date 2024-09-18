import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectDataModel } from '../../model/project-data.model';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-details-page',
  templateUrl: './project.component.html',
  standalone: true,
  imports: [
    JsonPipe
  ],
  styleUrls: ['./project.component.scss']
})
export class ProjectComponent implements OnInit {
  rowData: ProjectDataModel | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const data = params.get('data');
      if (data) {
        this.rowData = JSON.parse(decodeURIComponent(data));

        // Set the document title based on the project ID
        if (this.rowData) {
          document.title = `Project details - ${this.rowData.id}`;
        } else {
          document.title = 'Project Details';
        }
      }
    });
  }
}
