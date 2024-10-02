import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {GitLabProject} from 'intern-gitlabinfo-openapi-angular';
import {ProjectService} from '../../service/project.service';
import {HttpClientModule} from '@angular/common/http';
import {CookieService} from '../../service/cookie.service';
import {Subject, takeUntil} from 'rxjs';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule, Sort} from '@angular/material/sort';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDividerModule} from '@angular/material/divider'; // <-- Add MatDividerModule

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
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Observables for tracking changes
  private currentPageSubject = new Subject<number>();
  private itemsPerPageSubject = new Subject<number | 'all'>();
  private sortOrderSubject = new Subject<'asc' | 'desc'>();
  private sortColumnSubject = new Subject<string | null>();
  private allColumnsSelectedSubject = new Subject<boolean>();
  private allKindsSelectedSubject = new Subject<boolean>();
  private allErrorsSelectedSubject = new Subject<boolean>();

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
  allColumnsSelected: boolean = true;
  allKindsSelected: boolean = true;
  allErrorsSelected: boolean = true;

  // Pagination
  currentPage: number | undefined;
  itemsPerPage: number | 'all' | undefined | any;
  selectedItemsPerPageOption: number | 'all' | 'custom' | undefined;
  customRowsPerPage: number | null = null;
  itemsPerPageOptions: any = [5, 10, 15, 20, 50, 100, 'all', 'custom'];

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  commonFilter: string | undefined;
  useRegex: boolean | undefined;

  selectedColumnIds: any;

  columnsForm = new FormControl();
  errorForm = new FormControl();
  kindForm = new FormControl();


  columns = [
    {id: this.columnsId.NAME, label: 'Name', selected: true},
    {id: this.columnsId.DEFAULT_BRANCH, label: 'Default Branch', selected: true},
    {id: this.columnsId.PARENT_ARTIFACT_ID, label: 'Parent ArtifactId', selected: true},
    {id: this.columnsId.PARENT_VERSION, label: 'Parent Version', selected: true},
    {id: this.columnsId.ERRORS, label: 'Errors', selected: true},
    {id: this.columnsId.KIND, label: 'Kind', selected: true},
    {id: this.columnsId.DESCRIPTION, label: 'Description', selected: true},
  ];
  private columnSubjects: { [key: string]: Subject<void> } = {};
  private kindSubjects: { [key: string]: Subject<void> } = {};
  private errorSubjects: { [key: string]: Subject<void> } = {};

  @ViewChild(MatSort) sort: MatSort | undefined;

  constructor(private projectService: ProjectService,
              private cookieService: CookieService
  ) {
  }

  ngOnInit() {
    this.setInitialValues();      // Retrieve data from cookies
    this.loadProjects();          // Load projects from the service

    this.subscribeToChanges();

    this.updateAllColumnsSelected();
    this.updateAllKindsSelected();
    this.updateAllErrorsSelected();
  }

  subscribeToChanges() {
    this.currentPageSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.itemsPerPageSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.sortOrderSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.sortColumnSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());

    this.allColumnsSelectedSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.allKindsSelectedSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.allErrorsSelectedSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());

    this.columns.forEach(column => {
      if (!this.columnSubjects[column.id]) {
        this.columnSubjects[column.id] = new Subject<void>();
      }
      this.columnSubjects[column.id].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
    const selectedColumns = this.columns.filter(c => c.selected);
    this.columnsForm.setValue(selectedColumns)

    this.possibleKinds.forEach(kind => {
      if (!this.kindSubjects[kind.name]) {
        this.kindSubjects[kind.name] = new Subject<void>();
      }
      this.kindSubjects[kind.name].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
    const selectedKinds = this.possibleKinds.filter(k => k.selected) || [];
    this.kindForm.setValue(selectedKinds)

    this.possibleErrors.forEach(error => {
      if (!this.errorSubjects[error.code]) {
        this.errorSubjects[error.code] = new Subject<void>();
      }
      this.errorSubjects[error.code].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
    const selectedErrors = this.possibleErrors.filter(e => e.selected) || [];
    this.errorForm.setValue(selectedErrors)
  }

  loadProjects() {
    this.projectService.getGitLabProjects().subscribe(
      (data: GitLabProject[]) => {
        this.projects = data;
        this.filteredData = [...this.projects];
        this.applyFilters();
        this.setPossibleKinds();
        this.setPossibleErrors();
      },
      (error: any) => {
        console.error('Error fetching projects:', error);
      }
    );
  }

  // Setting itemsPerPage based on the cookie or the first option in itemsPerPageOptions
  setInitialValues() {
    // current page number
    this.currentPage = Number(this.cookieService.getCookie("page")) || 1;

    // items per page
    const itemsPerPageCookie = this.cookieService.getCookie("size");
    if (itemsPerPageCookie) {
      if (itemsPerPageCookie === 'custom' || itemsPerPageCookie === 'all') {
        this.selectedItemsPerPageOption = itemsPerPageCookie;
      } else {
        const parsedValue = Number(itemsPerPageCookie);
        this.selectedItemsPerPageOption = isNaN(parsedValue) ? undefined : parsedValue;
      }
    } else {
      this.selectedItemsPerPageOption = this.itemsPerPageOptions[0];
    }
    this.itemsPerPage = this.selectedItemsPerPageOption === 'all' || this.selectedItemsPerPageOption === 'custom'
      ? this.selectedItemsPerPageOption
      : (this.selectedItemsPerPageOption as number || DEFAULT_ITEMS_PER_PAGE); // Assign number or fallback

    // columns
    const selectedColumns = this.cookieService.getCookie("selectedColumns");
    if (selectedColumns) {
      const selectedColumnIds = selectedColumns.split(",");

      this.columns.forEach(column => {
        column.selected = selectedColumnIds.includes(column.id);
      });

      this.selectedColumnIds = this.columns.filter(c => c.selected).map(c => c.id);
    }
    //
    // // kinds
    // const selectedKinds = this.cookieService.getCookie(this.columnsId.KIND);
    // if (selectedKinds) {
    //   const selectedKindNames = selectedKinds.split(",");
    //   this.possibleKinds.forEach(kind => kind.selected = selectedKindNames.includes(kind.name));
    // }

    // Sorting
    this.sortColumn = this.cookieService.getCookie('sortBy') || '';
    this.sortDirection = (this.cookieService.getCookie('sortDest') as 'asc' | 'desc') || DEFAULT_SORT_ORDER;
    const sortState: Sort = {active: this.sortColumn, direction: this.sortDirection};
    if (this.sort) {
      this.sort.active = sortState.active;
      this.sort.direction = sortState.direction;
      this.sort.sortChange.emit(sortState);
    }
  }


  updateCookie() {
    if (this.currentPage !== undefined && this.currentPage !== null) {
      this.cookieService.setCookie("page", this.currentPage.toString());
    }
    if (this.itemsPerPage !== undefined && this.itemsPerPage !== null) {
      this.cookieService.setCookie("size", this.itemsPerPage.toString());
    }
    if (this.sortDirection !== undefined && this.sortDirection !== null) {
      this.cookieService.setCookie("sortDest", this.sortDirection.toString());
    }
    this.cookieService.setCookie("sortBy", this.sortColumn || '');

    // selected columns
    let selectedColumnIds = this.columns
      .filter(col => col.selected)
      .map(col => col.id).join(",");
    if (selectedColumnIds.length === 0) {
      selectedColumnIds = '';
    }
    this.cookieService.setCookie("selectedColumns", selectedColumnIds);

    // selected kinds
    const selectedKinds = this.possibleKinds
      .filter(kind => kind.selected)
      .map(kind => kind.name).join(",");
    this.cookieService.setCookie(this.columnsId.KIND, selectedKinds.length ? selectedKinds : '');

    // selected errors
    const selectedErrors = this.possibleErrors
      .filter(error => error.selected)
      .map(error => error.code).join(",");
    this.cookieService.setCookie(this.columnsId.ERRORS, selectedErrors.length ? selectedErrors : '');

    // common filter
    if (this.commonFilter !== undefined && this.commonFilter !== null) {
      this.cookieService.setCookie("commonFilter", this.commonFilter);
    }
    // use regex
    if (this.useRegex !== undefined) {
      this.cookieService.setCookie("useRegex", this.useRegex.toString());
    }
    // todo
  }

  setPossibleKinds() {
    const cookiedKinds = this.cookieService.getCookie(this.columnsId.KIND);
    const kindsSet = new Set(this.projects.map(project => project.kind));
    for (const kind of kindsSet) {
      const possibleKind: PossibleFilter = {
        name: kind,
        selected: (this.allKindsSelected || (cookiedKinds != null && cookiedKinds.includes(kind))),
      };
      this.possibleKinds.push(possibleKind);
    }
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

  updateAllColumnsSelected() {
    this.allColumnsSelected = this.columns.every(col => col.selected);
    this.allColumnsSelectedSubject.next(this.allColumnsSelected);
  }

  updateAllKindsSelected() {
    this.allKindsSelected = this.possibleKinds.every(kind => kind.selected);
    this.allKindsSelectedSubject.next(this.allKindsSelected);
  }

  updateAllErrorsSelected() {
    this.allErrorsSelected = this.possibleErrors.every(error => error.selected);
    this.allErrorsSelectedSubject.next(this.allErrorsSelected);
  }

  toggleAllColumnsSelection(): void {
    this.allColumnsSelected = !this.allColumnsSelected;
    this.columns.forEach(col => col.selected = this.allColumnsSelected);
    this.columnsForm.setValue(this.getSelectedColumns())
    this.allColumnsSelectedSubject.next(this.allColumnsSelected);
    this.selectedColumnIds = this.getSelectedColumns().map(c => c.id);
  }

  toggleAllKindsSelection() {
    this.allKindsSelected = !this.allKindsSelected;
    this.possibleKinds.forEach(kind => kind.selected = this.allKindsSelected);
    const kinds = this.possibleKinds.filter(k => k.selected);
    this.kindForm.setValue(kinds)
    this.allKindsSelectedSubject.next(this.allKindsSelected);


    console.log(this.possibleKinds)
  }

  toggleAllErrorsSelection() {
    this.allErrorsSelected = !this.allErrorsSelected;
    this.possibleErrors.forEach(error => error.selected = this.allErrorsSelected);
    const errors = this.possibleErrors.filter(e => e.selected);
    this.errorForm.setValue(errors)
    this.allErrorsSelectedSubject.next(this.allErrorsSelected);
  }

  toggleColumnSelection(columnId: string): void {
    const column = this.columns.find(col => col.id === columnId);
    if (column) {
      column.selected = !column.selected;
      this.columnSubjects[columnId].next();
      this.allColumnsSelected = this.columns.every(col => col.selected);
      this.allColumnsSelectedSubject.next(this.allColumnsSelected);
    }
    this.selectedColumnIds = this.getSelectedColumns().map(c => c.id);
  }

  toggleKindSelection(kindName: string) {
    const kind = this.possibleKinds.find(k => k.name === kindName);
    if (kind) {
      kind.selected = !kind.selected;
      if (!this.kindSubjects[kindName]) {
        this.kindSubjects[kindName] = new Subject<void>();
      }
      this.kindSubjects[kindName].next();

      this.allKindsSelected = this.possibleKinds.every(k => k.selected);
      this.allKindsSelectedSubject.next(this.allKindsSelected);
    }
  }

  toggleErrorSelection(errorCode: string) {
    const error = this.possibleErrors.find(e => e.code === errorCode);
    if (error) {
      error.selected = !error.selected;
      if (!this.errorSubjects[errorCode]) {
        this.errorSubjects[errorCode] = new Subject<void>();
      }
      this.errorSubjects[errorCode].next();

      this.allErrorsSelected = this.possibleErrors.every(e => e.selected);
      this.allErrorsSelectedSubject.next(this.allErrorsSelected);
    }
  }

  onItemsPerPageChange() {
    if (this.selectedItemsPerPageOption === 'custom') {
      this.customRowsPerPage = null;
    } else {
      this.itemsPerPage = this.selectedItemsPerPageOption as number | 'all';
    }
    if (this.itemsPerPage === undefined || this.itemsPerPage === null) {
      this.itemsPerPage = DEFAULT_ITEMS_PER_PAGE;
    }
    this.currentPage = 1;
    this.itemsPerPageSubject.next(this.itemsPerPage);
    this.updatePaginatedData();
  }

  changePage(increment: number) {
    this.currentPage = this.currentPage ?? 1;
    const newPage = this.currentPage + increment;
    if (newPage > 0 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.currentPageSubject.next(this.currentPage);
      this.updatePaginatedData();
    }
  }

  sortData(columnId: string | null, dist: string | null) {
    if (columnId !== null && dist !== null) {
      if (columnId) {
        this.sortColumn = columnId;
        this.sortDirection = dist === 'asc' ? 'asc' : 'desc';

        this.sortColumnSubject.next(this.sortColumn);
        this.sortOrderSubject.next(this.sortDirection);

        this.filteredData.sort((a, b) => {
          const valueA = this.getRowValue(a, columnId)?.toString().toLowerCase() ?? '';
          const valueB = this.getRowValue(b, columnId)?.toString().toLowerCase() ?? '';
          return (valueA > valueB ? 1 : -1) * (dist === 'asc' ? 1 : -1);
        });
      }
    }
    this.updatePaginatedData();
  }

  updatePaginatedData() {
    this.currentPage = this.currentPage ?? 1;
    let endIndex: number;
    endIndex = this.currentPage * (this.itemsPerPage === 'all' ? this.filteredData.length : this.itemsPerPage as number);
    if (endIndex > this.filteredData.length) {
      endIndex = this.filteredData.length;
    }
    let startIndex: number;
    if (this.currentPage > 1) {
      startIndex = (this.currentPage - 1) * (this.itemsPerPage === 'all' ? this.filteredData.length : this.itemsPerPage as number);
    } else {
      startIndex = 1;
    }
    if (startIndex > endIndex) {
      startIndex = endIndex - this.itemsPerPage;
      this.currentPage = this.totalPages
    }
    if (startIndex < 1) {
      startIndex = 1;
    }
    // console.log('curr index=' + this.currentPage + ' items=' + this.filteredData.length + ' per page=' + this.itemsPerPage)
    // console.log('start index=' + startIndex + ' end index=' + endIndex)
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
    const nameFilter = this.cookieService.getCookie(this.columnsId.NAME) || '';
    const defaultBranchFilter = this.cookieService.getCookie(this.columnsId.DEFAULT_BRANCH) || '';
    const parentArtifactIdFilter = this.cookieService.getCookie(this.columnsId.PARENT_ARTIFACT_ID) || '';
    const parentVersionFilter = this.cookieService.getCookie(this.columnsId.PARENT_VERSION) || '';
    const descriptionFilter = this.cookieService.getCookie(this.columnsId.DESCRIPTION) || '';

    this.filteredData = this.projects.filter(project => {
      const matchesName = project.name?.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesDefaultBranch = project.defaultBranch?.name?.toLowerCase().includes(defaultBranchFilter.toLowerCase());
      const matchesParentArtifactId = project.defaultBranch?.parent?.artifactId?.toLowerCase().includes(parentArtifactIdFilter.toLowerCase());
      const matchesParentVersion = project.defaultBranch?.parent?.version?.toLowerCase().includes(parentVersionFilter.toLowerCase());
      const matchesDescription = project.description?.toLowerCase().includes(descriptionFilter.toLowerCase());

      const matchesKind =
        this.possibleKinds.length === 0 ||
        this.allKindsSelected ||
        this.possibleKinds.some(kind => kind.selected && project.kind === kind.name);
      const matchesErrors =
        this.possibleErrors.length === 0 ||
        this.allErrorsSelected ||
        this.possibleErrors.some(error => error.selected && project.errors?.some(e => e.code === error.code));

      return matchesName &&
        matchesDefaultBranch &&
        matchesParentArtifactId &&
        matchesParentVersion &&
        matchesDescription &&
        matchesKind &&
        matchesErrors;
    });

    const sortBy = this.cookieService.getCookie('sortBy')
    const sortDest = this.cookieService.getCookie('sortDest')

    this.sortData(sortBy, sortDest);
  }

  protected readonly DropdownType = DropdownType;

  getSelectedColumns() {
    return this.columns.filter(option => option.selected);
  }

  onCustomRowsChange(event: any): void {
    const customValue = parseInt(event.target.value, 10);
    if (customValue >= 0) {
      this.customRowsPerPage = customValue;
      this.itemsPerPage = customValue;
      this.updatePaginatedData();
    }
  }

  viewDetails(row: GitLabProject): void {
    // const rowData = encodeURIComponent(JSON.stringify(row));
    // const url = /gitlab-projects/details?data=${rowData};
    // window.open(url, '_blank');
  }

  getSelectedKinds() {
    return this.cookieService.getCookie(this.columnsId.KIND);
  }

  getSelectedErrors() {
    return this.cookieService.getCookie(this.columnsId.ERRORS);
  }

  getPageSize() {
    if (this.selectedItemsPerPageOption === 'all') {
      return this.filteredData.length;
    } else if (this.selectedItemsPerPageOption === 'custom') {
      return this.customRowsPerPage;
    } else {
      return this.selectedItemsPerPageOption ? +this.selectedItemsPerPageOption : DEFAULT_ITEMS_PER_PAGE;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTotalItems(): number {
    return this.filteredData.length;
  }

  getPaginationEndIndex(): number {
    if (this.currentPage === undefined) {
      return 0;
    }
    const end = this.itemsPerPage > this.getTotalItems() ? this.getTotalItems() : this.itemsPerPage * this.currentPage;
    if (end > this.getTotalItems()) {
      return this.getTotalItems();
    }
    return end;
  }

  getPaginationStartIndex(): number {
    if (this.currentPage === undefined) {
      return 0;
    }
    if (this.currentPage === 1) {
      return 1;
    }
    const index = (this.currentPage - 1) * this.itemsPerPage + 1;
    if (index < 0) {
      return 0;
    }
    return index;
  }

  getValueFromCookie(columnId: string) {
    return this.cookieService.getCookie(columnId);
  }

  filterValue(id: string, $event: Event) {
    let element = $event.target as HTMLInputElement;
    this.cookieService.setCookie(id, element.value);
    this.applyFilters();
  }

  saveToCookie(key: any, value: string) {
    this.cookieService.setCookie(key, value)

    this.applyFilters()
  }

  highlightText(text: any, columnId: string): string {
    const searchValue = this.cookieService.getCookie(columnId);
    if (!searchValue) return text;
    const regex = new RegExp(`(${searchValue})`, 'gi');
    return text.replace(regex, `<mark style="background-color: yellow;">$1</mark>`);
  }

}
