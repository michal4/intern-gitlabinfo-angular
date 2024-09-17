// project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'https://api.example.com/projects';

  constructor(private http: HttpClient) { }

  getProjectById(id: string | null): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
