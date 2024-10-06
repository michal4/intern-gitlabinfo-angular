import {Component} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpClientModule} from '@angular/common/http';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDividerModule} from '@angular/material/divider'; // <-- Add MatDividerModule
import { Subject } from 'rxjs';
import {Branch} from 'intern-gitlabinfo-openapi-angular';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    NgClass,
    FormsModule,
    HttpClientModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss'
})
export class BranchesComponent {

  private destroy$ = new Subject<void>();

  branches: Branch[] = [];
  filteredData: Branch[] = [];
  paginatedData: Branch[] = [];

  // Pagination
  currentPage: number | undefined;
  itemsPerPage: number | 'all' | undefined | any;
  selectedItemsPerPageOption: number | 'all' | 'custom' | undefined;
  customRowsPerPage: number | null = null;
  itemsPerPageOptions: any = [5, 10, 15, 20, 50, 100, 'all', 'custom'];

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // columns = [
  //   {id: ColumnId.name.toString(), label: 'Name', selected: true},
  //   {id: ColumnId.defaultBranch.toString(), label: 'Default Branch', selected: true},
  //   {id: ColumnId.parentArtifactId.toString(), label: 'Parent ArtifactId', selected: true},
  //   {id: ColumnId.parentVersion.toString(), label: 'Parent Version', selected: true},
  //   {id: ColumnId.errors.toString(), label: 'Errors', selected: true},
  //   {id: ColumnId.kinds.toString(), label: 'Kind', selected: true},
  //   {id: ColumnId.description.toString(), label: 'Description', selected: true},
  // ];
}
