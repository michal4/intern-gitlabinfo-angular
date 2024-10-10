// project.service.ts
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  BranchesService,
  GetGitLabProjects200Response,
  GitLabProjectService,
  GitLabProjectsService
} from 'intern-gitlabinfo-openapi-angular';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  constructor(private gitLabProjectsService: GitLabProjectsService,
              private gitLabProjectService: GitLabProjectService,
              private branchesService: BranchesService) {
  }

  getGitLabProjects(): Observable<GetGitLabProjects200Response> {
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