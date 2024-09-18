import {Component, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {Router} from "@angular/router";
import {ProjectDataModel} from "../../model/project-data.model";

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    NgClass,
    FormsModule
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {

  constructor(private router: Router) { }

  dropdownOpen = false;
  allSelected = true;
  options = [
    {id: 'name', label: 'Name', selected: true, filter: ''},
    {id: 'defaultBranch', label: 'Default Branch', selected: true, filter: ''},
    {id: 'parentArtifactId', label: 'Parent ArtifactId', selected: true, filter: ''},
    {id: 'parentVersion', label: 'Parent Version', selected: true, filter: ''},
    {id: 'error', label: 'Error', selected: true, filter: ''},
    {id: 'description', label: 'Description', selected: true, filter: ''}
  ];

  data: ProjectDataModel[] = [
    {
      id: 1,
      name: 'Artifact 1',
      defaultBranch: 'main',
      parentArtifactId: 'artifact-123',
      parentVersion: '1.0.0',
      error: 'None',
      description: 'First artifact description'
    },
    {
      id: 2,
      name: 'Artifact 2',
      defaultBranch: 'dev',
      parentArtifactId: 'artifact-456',
      parentVersion: '1.2.0',
      error: 'Build failed',
      description: 'Second artifact description'
    }
  ];

  filteredData: ProjectDataModel[] = [];
  paginatedData: ProjectDataModel[] = [];
  currentPage = 1;
  itemsPerPage: number | 'all' = 5;
  selectedItemsPerPageOption: number | 'all' | 'custom' = 5; // New variable to manage 'custom'
  customRowsPerPage: number | null = null; // To store custom value
  itemsPerPageOptions = [5, 10, 15, 20, 50, 100, 'all', 'custom']; // Added 'custom'
  sortColumn: string | null = null;
  sortOrder: 'asc' | 'desc' = 'asc'; // Default sort order

  get totalPages() {
    return this.itemsPerPage === 'all'
      ? 1
      : Math.ceil(this.filteredData.length / (this.itemsPerPage as number));
  }

  ngOnInit(): void {
    this.loadFromCookies();
    this.filteredData = [...this.data];
    this.updatePaginatedData();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  toggleAll() {
    this.options.forEach(option => option.selected = this.allSelected);
    this.saveToCookies();
    this.applyFilter(); // Apply filters after toggling "All"
  }

  checkIfAllSelected() {
    this.allSelected = this.options.every(option => option.selected);
    this.saveToCookies();
    this.applyFilter(); // Apply filters after checking individual boxes
  }

  getSelectedColumns() {
    return this.options.filter(option => option.selected);
  }

  getRowValue(row: ProjectDataModel, columnId: string) {
    return row[columnId as keyof ProjectDataModel];
  }

  saveToCookies() {
    const selectedColumns = this.options
      .filter(option => option.selected)
      .map(option => option.id)
      .join(',');

    document.cookie = `selectedColumns=${encodeURIComponent(selectedColumns)}; path=/`;
  }

  loadFromCookies() {
    const cookieString = document.cookie;
    const cookies = cookieString.split('; ').reduce((acc, cookie) => {
      const [name, value] = cookie.split('=');
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);

    const selectedColumns = cookies['selectedColumns'] ? decodeURIComponent(cookies['selectedColumns']) : '';
    const selectedColumnIds = selectedColumns.split(',');

    this.options.forEach(option => {
      option.selected = selectedColumnIds.includes(option.id);
    });

    this.allSelected = this.options.every(option => option.selected);
    this.applyFilter(); // Apply filters after loading options from cookies
  }

  applyFilter(columnId?: string) {
    this.filteredData = this.data.filter(row => {
      return this.getSelectedColumns().every(column => {
        const value = this.getRowValue(row, column.id);
        const filter = column.filter ? column.filter.toLowerCase() : '';
        return !filter || value.toString().toLowerCase().includes(filter);
      });
    });

    this.sortData(this.sortColumn, this.sortOrder); // Sort data after filtering
    this.updatePaginatedData(); // Update pagination after sorting
  }

  sortData(columnId: string | null, order: 'asc' | 'desc') {
    if (columnId) {
      this.sortColumn = columnId;
      this.sortOrder = order;
      this.filteredData.sort((a, b) => {
        const valueA = this.getRowValue(a, columnId).toString().toLowerCase();
        const valueB = this.getRowValue(b, columnId).toString().toLowerCase();

        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        if (valueA > valueB) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    if (this.itemsPerPage === 'all') {
      this.paginatedData = this.filteredData;
    } else if (this.selectedItemsPerPageOption === 'custom' && this.customRowsPerPage) {
      const start = (this.currentPage - 1) * this.customRowsPerPage;
      const end = start + this.customRowsPerPage;
      this.paginatedData = this.filteredData.slice(start, end);
    } else {
      const start = (this.currentPage - 1) * (this.itemsPerPage as number);
      const end = start + (this.itemsPerPage as number);
      this.paginatedData = this.filteredData.slice(start, end);
    }
  }

  onItemsPerPageChange() {
    if (this.selectedItemsPerPageOption === 'custom') {
      this.customRowsPerPage = null; // Reset custom rows per page
    } else {
      this.itemsPerPage = this.selectedItemsPerPageOption as number | 'all'; // Assign the selected value
    }
    this.currentPage = 1; // Reset to the first page
    this.updatePaginatedData();
  }

  onCustomRowsChange(event: any) {
    const customValue = parseInt(event.target.value, 10);
    if (customValue >= 0) {
      this.customRowsPerPage = customValue;
      this.itemsPerPage = customValue; // Update itemsPerPage with the custom value
      this.updatePaginatedData();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * (this.customRowsPerPage || this.itemsPerPage as number);
  }

  getEndIndex(): number {
    const endIndex = this.currentPage * (this.customRowsPerPage || this.itemsPerPage as number);
    return endIndex > this.filteredData.length ? this.filteredData.length : endIndex;
  }

  viewDetails(row: ProjectDataModel): void {
    const rowData = encodeURIComponent(JSON.stringify(row));
    const url = `/gitlab-projects/details?data=${rowData}`;
    window.open(url, '_blank');
  }

}
