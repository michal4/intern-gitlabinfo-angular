import {Component, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {GitLabProject} from 'intern-gitlabinfo-openapi-angular';
import {ProjectService} from '../../service/project.service';
import {HttpClientModule} from '@angular/common/http';
import {CookieService} from '../../service/cookie.service';
import {Subject} from 'rxjs';

interface PossibleFilter {
  name: string;
  selected: boolean;
}

interface PossibleError {
  code: string;
  message: string;
  selected: boolean;
}

const DEFAULT_ITEMS_PER_PAGE = 5;
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

export enum DropdownType {
  COLUMNS = 'columnsOpen',
  KIND = 'kindOpen',
  ERRORS = 'errorsOpen'
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    ReactiveFormsModule,
    NgClass,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  // Observables for tracking changes
  private currentPageSubject = new Subject<number>();
  private itemsPerPageSubject = new Subject<number | 'all'>();
  private sortOrderSubject = new Subject<'asc' | 'desc'>();
  private sortColumnSubject = new Subject<string | null>();

  // Column identifiers
  readonly columnsId = {
    NAME: 'name',
    DEFAULT_BRANCH: 'defaultBranch',
    PARENT_ARTIFACT_ID: 'parentArtifactId',
    PARENT_VERSION: 'parentVersion',
    ERRORS: 'errors',
    KIND: 'kind',
    DESCRIPTION: 'description'
  };

  // Projects data
  projects: GitLabProject[] = [];
  filteredData: GitLabProject[] = [];
  paginatedData: GitLabProject[] = [];

  // Dropdown state management
  dropdownState: Record<DropdownType, boolean> = {
    [DropdownType.COLUMNS]: false,
    [DropdownType.KIND]: false,
    [DropdownType.ERRORS]: false
  };

  // Filterable options
  possibleKinds: PossibleFilter[] = [];
  possibleErrors: PossibleError[] = [];

  // Selection states
  allColumnsSelected = true;
  allKindsSelected = true;
  allErrorsSelected = true;

  // Pagination
  currentPage = 1;
  itemsPerPage: number | 'all' = DEFAULT_ITEMS_PER_PAGE;
  selectedItemsPerPageOption: number | 'all' | 'custom' = DEFAULT_ITEMS_PER_PAGE;
  customRowsPerPage: number | null = null;
  itemsPerPageOptions = [5, 10, 15, 20, 50, 100, 'all', 'custom'];

  // Sorting
  sortColumn: string | null = null;
  sortOrder: 'asc' | 'desc' = DEFAULT_SORT_ORDER;

  columns = [
    {id: this.columnsId.NAME, label: 'Name', selected: true, filter: ''},
    {id: this.columnsId.DEFAULT_BRANCH, label: 'Default Branch', selected: true, filter: ''},
    {id: this.columnsId.PARENT_ARTIFACT_ID, label: 'Parent ArtifactId', selected: true, filter: ''},
    {id: this.columnsId.PARENT_VERSION, label: 'Parent Version', selected: true, filter: ''},
    {id: this.columnsId.ERRORS, label: 'Errors', selected: true, filter: ''},
    {id: this.columnsId.KIND, label: 'Kind', selected: true, filter: ''},
    {id: this.columnsId.DESCRIPTION, label: 'Description', selected: true, filter: ''}
  ];
  private columnSubjects: { [key: string]: Subject<void> } = {};

  constructor(private projectService: ProjectService,
              private cookieService: CookieService) {
  }

  ngOnInit() {
    this.loadProjects();          // Step 1: Load projects from the service
    this.setCookiedValues();     // Step 2: Retrieve data from cookies

    // Subscribe to changes and update cookies accordingly
    this.currentPageSubject.subscribe(() => this.updateCookie());
    this.itemsPerPageSubject.subscribe(() => this.updateCookie());
    this.sortOrderSubject.subscribe(() => this.updateCookie());
    this.sortColumnSubject.subscribe(() => this.updateCookie());

    // Initialize column subject subscriptions
    this.columns.forEach(column => {
      if (!this.columnSubjects[column.id]) {
        this.columnSubjects[column.id] = new Subject<void>();
      }
      this.columnSubjects[column.id].subscribe(() => this.updateCookie());
    });

    // Step 3: Apply filters, sort, and select/deselect based on cookie data
    this.applyFilters();          // Apply filters after loading projects and setting cookie values
    this.updatePaginatedData();  // Ensure data is paginated based on initial state
  }

  loadProjects() {
    this.projectService.getGitLabProjects().subscribe(
      (data: GitLabProject[]) => {
        this.projects = data;
        this.filteredData = [...this.projects];
        this.setPossibleKinds();
        this.setPossibleErrors();
      },
      (error: any) => {
        console.error('Error fetching projects:', error);
      }
    );
  }

  setCookiedValues() {
    this.currentPage = Number(this.cookieService.getCookie("page")) || 1;
    const itemsPerPageCookie = this.cookieService.getCookie("size");
    this.selectedItemsPerPageOption = itemsPerPageCookie ? (isNaN(Number(itemsPerPageCookie)) ? "all" : Number(itemsPerPageCookie)) : DEFAULT_ITEMS_PER_PAGE;

    //sort
    const sortBy = this.cookieService.getCookie("sortBy");
    const sortDest = this.cookieService.getCookie("sortDest");



    const selectedColumns = this.cookieService.getCookie("selectedColumns");
    if (selectedColumns) {
      const selectedColumnIds = selectedColumns.split(",");
      this.columns.forEach(column => {
        column.selected = selectedColumnIds.includes(column.id);
      });
    }

    const filterValues = {
      [this.columnsId.NAME]: this.cookieService.getCookie(this.columnsId.NAME),
      [this.columnsId.DEFAULT_BRANCH]: this.cookieService.getCookie(this.columnsId.DEFAULT_BRANCH),
      [this.columnsId.PARENT_ARTIFACT_ID]: this.cookieService.getCookie(this.columnsId.PARENT_ARTIFACT_ID),
      [this.columnsId.PARENT_VERSION]: this.cookieService.getCookie(this.columnsId.PARENT_VERSION),
      [this.columnsId.DESCRIPTION]: this.cookieService.getCookie(this.columnsId.DESCRIPTION),
    };

    this.columns.forEach(column => {
      column.filter = filterValues[column.id] || ''; // Default to empty string if undefined
    });

    this.applySelectedFilters();
    this.updatePaginatedData(); // Ensure pagination is set up after loading data
    this.applyFilters(); // Apply filters after setting values
  }

  applySelectedFilters() {
    const selectedKinds = this.cookieService.getCookie(this.columnsId.KIND);
    if (selectedKinds) {
      const selectedKindNames = selectedKinds.split(",");
      this.possibleKinds.forEach(kind => kind.selected = selectedKindNames.includes(kind.name));
    }

    const selectedErrors = this.cookieService.getCookie(this.columnsId.ERRORS);
    if (selectedErrors) {
      const selectedErrorCodes = selectedErrors.split(",");
      this.possibleErrors.forEach(error => error.selected = selectedErrorCodes.includes(error.code));
    }
  }

  updateCookie() {
    this.cookieService.setCookie("page", this.currentPage.toString());
    this.cookieService.setCookie("size", this.itemsPerPage.toString());
    this.cookieService.setCookie("sortBy", this.sortColumn || '');
    this.cookieService.setCookie("sortDest", this.sortOrder.toString());

    // Save selected columns
    const selectedColumnIds = this.columns
      .filter(col => col.selected)
      .map(col => col.id).join(",");
    this.cookieService.setCookie("selectedColumns", selectedColumnIds);

    // selected kinds
    const selectedKinds = this.possibleKinds
      .filter(kind => kind.selected)
      .map(kind => kind.name).join(",");
    this.cookieService.setCookie(this.columnsId.KIND, selectedKinds);

    // selected errors
    const selectedErrors = this.possibleErrors
      .filter(error => error.selected)
      .map(error => error.code).join(",");
    this.cookieService.setCookie(this.columnsId.ERRORS, selectedErrors);

    // filters
    // todo

  }

  setPossibleKinds() {
    const kindsSet = new Set(this.projects.map(project => project.kind));
    this.possibleKinds = Array.from(kindsSet).map(kind => ({name: kind, selected: true}));
  }

  setPossibleErrors() {
    const errorMap = new Map<string, string>(); // Key: error code, Value: error message
    this.projects.forEach(project => {
      if (Array.isArray(project.errors)) {
        project.errors.forEach(error => {
          if (error.code && error.message) {
            errorMap.set(error.code, error.message);
          }
        });
      }
      if (Array.isArray(project.branches)) {
        project.branches.forEach(branch => {
          if (Array.isArray(branch.errors)) {
            branch.errors.forEach(error => {
              if (error.code && error.message) {
                errorMap.set(error.code, error.message);
              }
            });
          }
        });
      }
    });

    this.possibleErrors = Array.from(errorMap.entries()).map(([code, message]) => ({
      code: code,
      message: message,
      selected: true
    }));
  }

  get totalPages() {
    return this.itemsPerPage === 'all'
      ? 1
      : Math.ceil(this.filteredData.length / (this.itemsPerPage as number));
  }

  toggleDropdown(type: DropdownType) {
    this.dropdownState[type] = !this.dropdownState[type];
  }

  toggleAllOptions(target: any) {
    let options;
    let allSelected;
    switch (target) {
      case this.columnsId.KIND: {
        options = this.possibleKinds;
        allSelected = this.allKindsSelected;
        break;
      }
      case this.columnsId.ERRORS: {
        options = this.possibleErrors;
        allSelected = this.allErrorsSelected;
        break;
      }
      default:
        options = this.columns;
        allSelected = this.allColumnsSelected;
    }
    options.forEach(option => option.selected = allSelected);
    this.updateCookie();
  }

  onItemsPerPageChange() {
    if (this.selectedItemsPerPageOption === 'custom') {
      this.customRowsPerPage = null; // Reset custom rows per page
    } else {
      this.itemsPerPage = this.selectedItemsPerPageOption as number | 'all'; // Assign the selected value
    }
    this.currentPage = 1; // Reset to the first page
    this.itemsPerPageSubject.next(this.itemsPerPage); // Notify the change
    this.updatePaginatedData();
  }

  changePage(increment: number) {
    const newPage = this.currentPage + increment;
    if (newPage > 0 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.currentPageSubject.next(this.currentPage); // Notify the change
      this.updatePaginatedData();
    }
  }

  sortData(columnId: string | null, order: 'asc' | 'desc') {
    if (columnId) {
      this.sortColumn = columnId;
      this.sortOrder = order;

      this.sortColumnSubject.next(this.sortColumn); // Notify the change
      this.sortOrderSubject.next(this.sortOrder); // Notify the change

      this.filteredData.sort((a, b) => {
        const valueA = this.getRowValue(a, columnId)?.toString().toLowerCase() ?? '';
        const valueB = this.getRowValue(b, columnId)?.toString().toLowerCase() ?? '';
        return (valueA > valueB ? 1 : -1) * (order === 'asc' ? 1 : -1);
      });
    }
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    const startIndex = (this.currentPage - 1) * (this.itemsPerPage === 'all' ? this.filteredData.length : this.itemsPerPage as number);
    const endIndex = this.currentPage * (this.itemsPerPage === 'all' ? this.filteredData.length : this.itemsPerPage as number);
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  getRowValue(row: GitLabProject, columnId: string) {
    switch (columnId) {
      case this.columnsId.DEFAULT_BRANCH:
        return row.defaultBranch.name;
      case this.columnsId.PARENT_ARTIFACT_ID:
        return row.defaultBranch?.parent?.artifactId;
      case this.columnsId.PARENT_VERSION:
        return row.defaultBranch?.parent?.version;
      case this.columnsId.ERRORS:
        return this.getErrors(row);
      default:
        return row[columnId as keyof GitLabProject];
    }
  }

  getErrors(row: GitLabProject): string {
    const projectErrors = this.formatErrors(row.errors || []);
    const branchErrors = this.formatErrors(row.defaultBranch?.errors || []);
    return [projectErrors, branchErrors].filter(Boolean).join(', ') || '';
  }

  formatErrors(errors: any[]): string {
    return Array.isArray(errors) ? errors.map(e => e.code).join(', ') : '';
  }

  applyFilters() {
    const nameFilter = this.columns.find(col => col.id === this.columnsId.NAME)?.filter || '';
    const defaultBranchFilter = this.columns.find(col => col.id === this.columnsId.DEFAULT_BRANCH)?.filter || '';

    this.filteredData = this.projects.filter(project => {
      const matchesName = project.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesDefaultBranch = project.defaultBranch.name.toLowerCase().includes(defaultBranchFilter.toLowerCase());

      const matchesKind = this.possibleKinds.length === 0 || this.possibleKinds.some(kind => kind.selected && project.kind === kind.name);
      const matchesErrors = this.possibleErrors.length === 0 || this.possibleErrors.some(error => error.selected && project.errors?.map(e => e.code).includes(error.code));

      return matchesName && matchesDefaultBranch && matchesKind && matchesErrors;
    });

    this.updatePaginatedData();
  }

  protected readonly DropdownType = DropdownType;

  getSelectedColumns() {
    return this.columns.filter(option => option.selected);
  }

  onCustomRowsChange(event: any) {
    const customValue = parseInt(event.target.value, 10);
    if (customValue >= 0) {
      this.customRowsPerPage = customValue;
      this.itemsPerPage = customValue; // Update itemsPerPage with the custom value
      this.updatePaginatedData();
    }
  }

  viewDetails(row: GitLabProject): void {
    // const rowData = encodeURIComponent(JSON.stringify(row));
    // const url = /gitlab-projects/details?data=${rowData};
    // window.open(url, '_blank');
  }
}
