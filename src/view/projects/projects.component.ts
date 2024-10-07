import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {GitLabProject, ModelError} from 'intern-gitlabinfo-openapi-angular';
import {ProjectService} from '../../service/project.service';
import {HttpClientModule} from '@angular/common/http';
import {CookieService} from '../../service/cookie.service';
import {Subject, takeUntil} from 'rxjs';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSort, MatSortModule, Sort} from '@angular/material/sort';
import {MatCheckboxChange, MatCheckboxModule} from '@angular/material/checkbox';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDividerModule} from '@angular/material/divider'; // <-- Add MatDividerModule
import {Router} from '@angular/router';
import {ColumnId} from '../../model/column-id.enum';
import { DisplayTextUtils } from '../../util/displayTextUtils';

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
  private useRegexSubject = new Subject<boolean>();
  private commonFilterSubject = new Subject<string>();

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
  possibleArchivedType: PossibleFilter[] = [
    {name: 'All projects', selected: false},
    {name: 'Archived projects', selected: false},
    {name: 'Live projects', selected: false}];

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

  commonFilter: string = '';
  useRegex: any;

  selectedColumnIds: any;

  columnsForm = new FormControl();
  errorForm = new FormControl();
  kindForm = new FormControl();
  archivedForm = new FormControl();

  columns = [
    {id: ColumnId.name.toString(), label: 'Name', selected: true},
    {id: ColumnId.defaultBranch.toString(), label: 'Default Branch', selected: true},
    {id: ColumnId.parentArtifactId.toString(), label: 'Parent ArtifactId', selected: true},
    {id: ColumnId.parentVersion.toString(), label: 'Parent Version', selected: true},
    {id: ColumnId.errors.toString(), label: 'Errors', selected: true},
    {id: ColumnId.kinds.toString(), label: 'Kind', selected: true},
    {id: ColumnId.description.toString(), label: 'Description', selected: true},
  ];
  private columnSubjects: { [key: string]: Subject<void> } = {};
  private kindSubjects: { [key: string]: Subject<void> } = {};
  private errorSubjects: { [key: string]: Subject<void> } = {};

  @ViewChild(MatSort) sort: MatSort | undefined;

  displayTextUtils: DisplayTextUtils;

  constructor(private projectService: ProjectService,
              private cookieService: CookieService,
              private router: Router
  ) {
    this.displayTextUtils = new DisplayTextUtils(this.cookieService);
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
    this.useRegexSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.commonFilterSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
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

    // Sorting
    this.sortColumn = this.cookieService.getCookie('sortBy') || '';
    this.sortDirection = (this.cookieService.getCookie('sortDest') as 'asc' | 'desc') || DEFAULT_SORT_ORDER;
    const sortState: Sort = {active: this.sortColumn, direction: this.sortDirection};
    if (this.sort) {
      this.sort.active = sortState.active;
      this.sort.direction = sortState.direction;
      this.sort.sortChange.emit(sortState);
    }

    this.useRegex = this.cookieService.getCookie('userRegex') === 'true' || false;

    const selectedArchivedTypes = this.cookieService.getCookie("archived");
    //todo
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
    this.cookieService.setCookie(ColumnId.kinds, selectedKinds.length ? selectedKinds : '');

    // selected errors
    const selectedErrors = this.possibleErrors
      .filter(error => error.selected)
      .map(error => error.code).join(",");
    this.cookieService.setCookie(ColumnId.errors, selectedErrors.length ? selectedErrors : '');

  }

  setPossibleKinds() {
    const cookiedKinds = this.cookieService.getCookie(ColumnId.kinds);
    const kindsSet = new Set(this.projects.map(project => project.kind));
    for (const kind of kindsSet) {
      const possibleKind: PossibleFilter = {
        name: kind,
        selected: (this.allKindsSelected || (cookiedKinds != null && cookiedKinds.includes(kind))),
      };
      this.possibleKinds.push(possibleKind);
    }

    this.possibleKinds.forEach(kind => {
      if (!this.kindSubjects[kind.name]) {
        this.kindSubjects[kind.name] = new Subject<void>();
      }
      this.kindSubjects[kind.name].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
    const selectedKinds = this.possibleKinds.filter(k => k.selected) || [];
    this.kindForm.setValue(selectedKinds)
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

    const cookiedErrors = this.cookieService.getCookie(ColumnId.errors.toString())?.split(',') || [];
    for (let i = 0; i < this.possibleErrors.length; i++) {
      const error = this.possibleErrors[i];
      this.possibleErrors[i].selected = cookiedErrors.includes(error.code);
      if (!this.errorSubjects[error.code]) {
        this.errorSubjects[error.code] = new Subject<void>();
      }
      this.errorSubjects[error.code].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    }

    const selectedErrors = this.possibleErrors.filter(e => e.selected) || [];
    this.errorForm.setValue(selectedErrors)
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
      if (this.kindSubjects[kindName]) {
        this.kindSubjects[kindName].next();
      }
      this.allKindsSelected = this.possibleKinds.every(k => k.selected);
      if (this.allKindsSelected) {
        this.allKindsSelectedSubject.next(this.allKindsSelected);
      }
      const selectedKinds = this.possibleKinds.filter(k => k.selected) || [];
      this.kindForm.setValue(selectedKinds)
      this.applyFilters();
    }
  }

  toggleErrorSelection(code: string): void {
    const error = this.possibleErrors.find(k => k.code === code);
    if (error) {
      error.selected = !error.selected;
      if (this.errorSubjects[code]) {
        this.errorSubjects[code].next();
      }
      this.allErrorsSelected = this.possibleErrors.every(e => e.selected);
      if (this.allErrorsSelected) {
        this.allErrorsSelectedSubject.next(this.allErrorsSelected);
      }
      const selectedErrors = this.possibleErrors.filter(e => e.selected) || [];
      this.errorForm.setValue(selectedErrors)
      this.applyFilters();
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
      startIndex = 0;
    }
    if (startIndex > endIndex) {
      startIndex = endIndex - this.itemsPerPage;
      this.currentPage = this.totalPages
    }
    if (startIndex < 1) {
      startIndex = 0;
    }
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  getRowValue(project: GitLabProject, columnId: string): string {
    return this.displayTextUtils.getRowValue(project, columnId);
  }

  getErrorValues(project: GitLabProject): ModelError[] {
    let errors: ModelError[] = project.errors ?? [];
    let branchesErrors: ModelError[] = [];
    project.branches.forEach((branch) => {
      branchesErrors.push(...(branch.errors ?? []));
    });
    const uniqueErrorCodes = new Set<string>();
    const allErrors: ModelError[] = [...errors, ...branchesErrors].filter((error) => {
      if (!uniqueErrorCodes.has(error.code)) {
        uniqueErrorCodes.add(error.code);
        return true;
      }
      return false;
    });

    return allErrors;
  }


  getErrors(project: GitLabProject): string {
    return this.displayTextUtils.getErrors(project);
  }

  applyFilters() {
    const nameFilter = this.cookieService.getCookie(ColumnId.name) || '';
    const defaultBranchFilter = this.cookieService.getCookie(ColumnId.defaultBranch) || '';
    const parentArtifactIdFilter = this.cookieService.getCookie(ColumnId.parentArtifactId) || '';
    const parentVersionFilter = this.cookieService.getCookie(ColumnId.parentVersion) || '';
    const descriptionFilter = this.cookieService.getCookie(ColumnId.description) || '';
    const commonFilter = this.cookieService.getCookie('commonFilter') || '';
    const useRegex = this.cookieService.getCookie('useRegex') === 'true';
    const selectedKinds = this.getSelectedKinds();
    let selectedErrors = this.getSelectedErrors()?.split(',').filter(error => error.trim() !== '') ?? [];

    this.filteredData = this.projects.filter(project => {
      const matchesRegexOrIncludes = (value: string, filter: string) => {
        if (useRegex) {
          try {
            const regex = new RegExp(filter, 'i');
            return regex.test(value || '');
          } catch (e) {
            console.error('Invalid regex pattern: ', filter);
            return false;
          }
        } else {
          return value?.toLowerCase().includes(filter.toLowerCase());
        }
      };
      const matchesName = matchesRegexOrIncludes(project.name, nameFilter);
      const matchesDefaultBranch = matchesRegexOrIncludes(project.defaultBranch?.name, defaultBranchFilter);
      const matchesParentArtifactId = matchesRegexOrIncludes(project.defaultBranch?.parent?.artifactId ?? '', parentArtifactIdFilter);
      const matchesParentVersion = matchesRegexOrIncludes(project.defaultBranch?.parent?.version ?? '', parentVersionFilter);
      const matchesDescription = matchesRegexOrIncludes(project.description ?? '', descriptionFilter);
      const matchesKind =
        this.allKindsSelected || selectedKinds?.includes(project.kind);
      const projectErrors = this.getErrors(project) ?? [];
      let errors = projectErrors.split(',').filter(error => error.trim() !== '') ?? [];
      const matchesErrors =
        this.allErrorsSelected ||
        selectedErrors.length === 0 ||
        this.isErrorsSelected(errors, selectedErrors);
      const matchesCommonFilter = this.isCommonFilterMatched(project, commonFilter.toLowerCase());

      return (
        matchesName &&
        matchesDefaultBranch &&
        matchesParentArtifactId &&
        matchesParentVersion &&
        matchesDescription &&
        matchesKind &&
        matchesErrors &&
        matchesCommonFilter
      );
    });
    // sort
    const sortBy = this.cookieService.getCookie('sortBy');
    const sortDest = this.cookieService.getCookie('sortDest');
    this.sortData(sortBy, sortDest);
  }

  isCommonFilterMatched(project: GitLabProject, commonFilter: string): boolean {
    const propertiesToCheck: string[] = [
      project.name,
      project.url,
      project.kind,
      project.description ?? '',
      project.cicd?.configurationFile ?? '',
      this.getErrors(project)
    ];
    const checkMinProps = this.filter(propertiesToCheck, commonFilter);
    if (checkMinProps) {
      return checkMinProps;
    }

    const variables = project.cicd.variables;
    for (const key in variables) {
      if (variables.hasOwnProperty(key)) {
        const keyIncl = key.toLowerCase().includes(commonFilter);
        const valueIncl = variables[key].toLowerCase().includes(commonFilter);
        if (keyIncl || valueIncl) {
          return true;
        }
      }
    }

    const branches = project.branches;
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const toCheck = [
        branch.name,
        branch.lastCommitCreatedAt,
        branch.gitLabConfig,
        branch.groupId,
        branch.artifactId,
        branch.parent?.artifactId,
        branch.parent?.version,
        this.getErrors(project)
      ];
      const checkBranchProps = this.filter(toCheck, commonFilter);
      if (checkBranchProps) {
        return checkBranchProps;
      }
    }

    return false;
  }

  filter(propertiesToCheck: any[], filter: string) {
    for (const prop of propertiesToCheck) {
      if (prop?.toLowerCase().includes(filter)) {
        return true;
      }
    }
    return false;
  }

  isErrorsSelected(errors: string[], selectedErrors: string[]) {
    if (selectedErrors.length === 0) {
      return true;
    }
    const trimmedErrors = errors.map(error => error.trim());
    for (let i = 0; i < selectedErrors.length; i++) {
      const selectedError = selectedErrors[i].trim(); // Trim selected error
      const isSelected = trimmedErrors.includes(selectedError);
      if (!isSelected) {
        return false;
      }
    }
    return true;
  }

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

  getSelectedKinds() {
    return this.cookieService.getCookie(ColumnId.kinds.toString());
  }

  getSelectedErrors() {
    return this.cookieService.getCookie(ColumnId.errors.toString());
  }

  getValueFromCookie(columnId: string) {
    return this.cookieService.getCookie(columnId);
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

  filterValue(id: string, $event: Event): void {
    let element = $event.target as HTMLInputElement;
    this.cookieService.setCookie(id, element.value);
    this.applyFilters();
  }

  useRegexChange(event: MatCheckboxChange) {
    this.useRegex = event.checked;
    this.useRegexSubject.next(this.useRegex);
    this.cookieService.setCookie("useRegex", this.useRegex);
    this.applyFilters();
  }

  getUseRegex(): boolean {
    const useRegexFromCookie = this.getValueFromCookie('useRegex');
    return useRegexFromCookie === 'true' ? true : false;
  }

  saveToCookie(key: any, value: string): void {
    this.cookieService.setCookie(key, value)
    this.applyFilters()
  }

  applyCommonFilter(filter: string) {
    this.saveToCookie('commonFilter', filter);
    this.commonFilterSubject.next(filter);
  }

  getSelectedArchived() {
    //todo
    return "";
  }

  toggleArchivedSelection(name: string) {
    //todo
  }

  toggleAllArchivedSelection() {
    //todo
  }

  highlightText(rowValue: string, id: any) {
    return this.displayTextUtils.highlight(rowValue, id, this.useRegex);
  }

  goToGitLabProjectDetails(project: GitLabProject): void {
    this.router.navigate(['/gitlab-project', project.projectId]);
  }

  goToBranches(project: GitLabProject): void {
    this.router.navigate(['/branches'], {queryParams: {projectId: project.projectId}});
  }

}
