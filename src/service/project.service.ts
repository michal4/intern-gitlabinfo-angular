// project.service.ts
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  BranchesService,
  GitLabProject,
  GitLabProjectsService,
  GitLabProjectService
} from 'intern-gitlabinfo-openapi-angular';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  constructor(private gitLabProjectsService: GitLabProjectsService,
              private gitLabProjectService: GitLabProjectService,
              private branchesService: BranchesService) {
  }

  getGitLabProjects(): Observable<GitLabProject[]> {
    return this.gitLabProjectsService.getGitLabProjects();
  }

  // todo change to Branch
  getBranches(): Observable<any[]> {
    return this.branchesService.getBranches();
  }

  getProjectById(id: number): Observable<any> {
    return this.gitLabProjectService.getGitLabProjectById(id);
  }
  
}