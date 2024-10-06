import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {JsonPipe} from '@angular/common';
import {GitLabProject} from 'intern-gitlabinfo-openapi-angular';
import {ProjectService} from '../../service/project.service';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-details-page',
  standalone: true,
  imports: [
    NgIf,
    JsonPipe
  ],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss']
})
export class ProjectComponent implements OnInit {

  project: GitLabProject | null = null;

  constructor(private route: ActivatedRoute, private projectService: ProjectService) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        this.loadProject(id);
      }
    });
  }

  loadProject(id: number): void {
    console.log('load project eith id ' + id)
    this.projectService.getProjectById(id).subscribe(
      (project: GitLabProject) => {
        this.project = project;
      },
      (error: any) => {
        console.error('Error fetching project:', error);
      });

    console.log(this.project)
  }

}
