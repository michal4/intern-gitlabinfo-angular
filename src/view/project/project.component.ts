import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {JsonPipe} from '@angular/common';
import {GitLabProject} from 'intern-gitlabinfo-openapi-angular'; 

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
  rowData: GitLabProject | null = null;

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const data = params.get('data');
      if (data) {
        this.rowData = JSON.parse(decodeURIComponent(data));

        // Set the document title based on the project ID
        if (this.rowData) {
          document.title = `Project details - ${this.rowData.projectId}`;
        } else {
          document.title = 'Project Details';
        }
      }
    });
  }
}
