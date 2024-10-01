import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {GitLabProject} from 'intern-gitlabinfo-openapi-angular';
import {ProjectService} from '../../service/project.service';
import {HttpClientModule} from '@angular/common/http';
import {CookieService} from '../../service/cookie.service';
import {Subject, takeUntil} from 'rxjs';

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
  sortColumn: string | null | undefined;
  sortOrder: 'asc' | 'desc' | undefined;

  commonFilter: string | undefined;
  useRegex: boolean | undefined;

  columns = [
    {id: this.columnsId.NAME, label: 'Name', selected: true, filter: ''},
    {id: this.columnsId.DEFAULT_BRANCH, label: 'Default Branch', selected: true, filter: ''},
    {id: this.columnsId.PARENT_ARTIFACT_ID, label: 'Parent ArtifactId', selected: true, filter: ''},
    {id: this.columnsId.PARENT_VERSION, label: 'Parent Version', selected: true, filter: ''},
    {id: this.columnsId.ERRORS, label: 'Errors', selected: true, filter: ''},
    {id: this.columnsId.KIND, label: 'Kind', selected: true, filter: ''},
    {id: this.columnsId.DESCRIPTION, label: 'Description', selected: true, filter: ''},
  ];
  private columnSubjects: { [key: string]: Subject<void> } = {};
  private kindSubjects: { [key: string]: Subject<void> } = {};

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

    this.possibleKinds.forEach(kind => {
      if (!this.kindSubjects[kind.name]) {
        this.kindSubjects[kind.name] = new Subject<void>();
      }
      this.kindSubjects[kind.name].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
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

    // Sorting
    this.sortColumn = this.cookieService.getCookie("sortBy") || null;
    this.sortOrder = (this.cookieService.getCookie("sortDest") as 'asc' | 'desc') || DEFAULT_SORT_ORDER;

    // columns
    const selectedColumns = this.cookieService.getCookie("selectedColumns");
    if (selectedColumns) {
      const selectedColumnIds = selectedColumns.split(",");

      this.columns.forEach(column => {
        column.selected = selectedColumnIds.includes(column.id);
      });
    }
    //
    // // kinds
    // const selectedKinds = this.cookieService.getCookie(this.columnsId.KIND);
    // if (selectedKinds) {
    //   const selectedKindNames = selectedKinds.split(",");
    //   this.possibleKinds.forEach(kind => kind.selected = selectedKindNames.includes(kind.name));
    // }

    this.columns.forEach(column => {
      column.filter = this.cookieService.getCookie(column.id) || '';
    });

  }

  updateCookie() {
    if (this.currentPage !== undefined && this.currentPage !== null) {
      this.cookieService.setCookie("page", this.currentPage.toString());
    }
    if (this.itemsPerPage !== undefined && this.itemsPerPage !== null) {
      this.cookieService.setCookie("size", this.itemsPerPage.toString());
    }
    if (this.sortOrder !== undefined && this.sortOrder !== null) {
      this.cookieService.setCookie("sortDest", this.sortOrder.toString());
    }
    this.cookieService.setCookie("sortBy", this.sortColumn || '');

    // selected columns
    let selectedColumnIds = this.columns
      .filter(col => col.selected)
      .map(col => col.id).join(",");
    if (selectedColumnIds.length === 0) {
      selectedColumnIds = '-';
    }
    this.cookieService.setCookie("selectedColumns", selectedColumnIds);

    // selected kinds
    const selectedKinds = this.possibleKinds
      .filter(kind => kind.selected)
      .map(kind => kind.name).join(",");
    this.cookieService.setCookie(this.columnsId.KIND, selectedKinds.length ? selectedKinds : '-');

    // selected errors
    const selectedErrors = this.possibleErrors
      .filter(error => error.selected)
      .map(error => error.code).join(",");
    this.cookieService.setCookie(this.columnsId.ERRORS, selectedErrors.length ? selectedErrors : '-');

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

  toggleAllColumnsSelection() {
    this.allColumnsSelected = !this.allColumnsSelected;
    this.columns.forEach(col => col.selected = this.allColumnsSelected);
    this.allColumnsSelectedSubject.next(this.allColumnsSelected);
  }

  toggleAllKindsSelection() {
    this.allKindsSelected = !this.allKindsSelected;
    this.possibleKinds.forEach(kind => kind.selected = this.allKindsSelected);
    this.allKindsSelectedSubject.next(this.allKindsSelected);
  }

  toggleAllErrorsSelection() {
    this.allErrorsSelected = !this.allErrorsSelected;
    this.possibleErrors.forEach(error => error.selected = this.allErrorsSelected);
    this.allErrorsSelectedSubject.next(this.allErrorsSelected);
  }

  toggleColumnSelection(columnId: string) {
    const column = this.columns.find(col => col.id === columnId);
    if (column) {
      column.selected = !column.selected;
      this.columnSubjects[columnId].next();
      this.allColumnsSelected = this.columns.every(col => col.selected);
      this.allColumnsSelectedSubject.next(this.allColumnsSelected);
    }
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
      this.updateCookie();
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
        this.sortOrder = dist === 'asc' ? 'asc' : 'desc';

        this.sortColumnSubject.next(this.sortColumn);
        this.sortOrderSubject.next(this.sortOrder);

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
    const nameFilter = this.columns.find(col => col.id === this.columnsId.NAME)?.filter || '';
    const defaultBranchFilter = this.columns.find(col => col.id === this.columnsId.DEFAULT_BRANCH)?.filter || '';
    const parentArtifactIdFilter = this.columns.find(col => col.id === this.columnsId.PARENT_ARTIFACT_ID)?.filter || '';
    const parentVersionFilter = this.columns.find(col => col.id === this.columnsId.PARENT_VERSION)?.filter || '';
    const descriptionFilter = this.columns.find(col => col.id === this.columnsId.DESCRIPTION)?.filter || '';

    this.cookieService.setCookie(this.columnsId.NAME, nameFilter.toLowerCase())
    this.cookieService.setCookie(this.columnsId.DEFAULT_BRANCH, defaultBranchFilter.toLowerCase())
    this.cookieService.setCookie(this.columnsId.PARENT_ARTIFACT_ID, parentArtifactIdFilter.toLowerCase())
    this.cookieService.setCookie(this.columnsId.PARENT_VERSION, parentVersionFilter.toLowerCase())
    this.cookieService.setCookie(this.columnsId.DESCRIPTION, descriptionFilter.toLowerCase())

    // console.log('kinds=' + this.possibleKinds)
    // console.log('allKindsSelected=' + this.allKindsSelected)

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

  getSelectedKinds() {
    return this.possibleKinds.filter(k => k.selected === true).map(k=> k.name);
  }

  getSelectedErrors () {
    return this.possibleErrors.filter(e => e.selected === true).map(e=> e.code);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
