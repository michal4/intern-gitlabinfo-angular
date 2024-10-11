import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {DatePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {Branch, ModelError} from 'intern-gitlabinfo-openapi-angular';
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
import {BranchColumnId, Column, columnSettings} from '../../model/branch-column';
import {Error} from '../../model/errors';
import {DisplayTextUtils, getDays} from '../../util/displayTextUtils';
import {Filter} from '../../model/filters';
import {ResizableModule} from '../../components/resizable/resizable.module';
import {ActivatedRoute, Router} from '@angular/router';


const DEFAULT_ITEMS_PER_PAGE = 5;
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'asc';

export enum DropdownType {
  COLUMNS = 'columnsOpen',
  ERRORS = 'errorsOpen'
}

export const COMMON_FILTER = 'commonFilter';
export const COLUMNS = 'columns';
export const ALL = 'All';
export const PREFIX_COOKIE = 'b_';


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
    MatDividerModule,
    ResizableModule
  ],
  providers: [DatePipe],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss'
})
export class BranchesComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // Observables for tracking changes
  private currentPageSubject = new Subject<number>();
  private itemsPerPageSubject = new Subject<number | 'all'>();
  private sortOrderSubject = new Subject<'asc' | 'desc'>();
  private sortColumnSubject = new Subject<string | null>();
  private useRegexSubject = new Subject<boolean>();
  private commonFilterSubject = new Subject<string>();

  // Projects data
  branches: Branch[] = [];
  filteredData: Branch[] = [];
  paginatedData: Branch[] = [];
  loadDateTime: String = '';

  // Dropdown state management
  dropdownState: Record<DropdownType, boolean> = {
    [DropdownType.COLUMNS]: false,
    [DropdownType.ERRORS]: false
  };

  // Selection states
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

  selectedColumnIds: any = [];

  columnsForm: FormControl<Column[]> = new FormControl();
  errorForm: FormControl<Error[]> = new FormControl();

  columns: Column[] = Object.values(columnSettings);
  selectedColumns: Column[] = this.columnsForm.value;
  errors: Error[] = [];
  selectedErrors: Error[] = this.errorForm.value;

  selectedFilters: Filter[] = [];

  private columnSubjects: { [key: string]: Subject<void> } = {};
  private errorSubjects: { [key: string]: Subject<void> } = {};

  lastCommitedAtFrom: number;
  lastCommitedAtTo: number;
  maxLastCommitedAtTo: number = Number.MAX_SAFE_INTEGER;

  @ViewChild(MatSort) sort: MatSort | undefined;

  displayTextUtils: DisplayTextUtils;

  constructor(private projectService: ProjectService,
              private cookieService: CookieService,
              private route: ActivatedRoute,
              private router: Router
  ) {
    this.displayTextUtils = new DisplayTextUtils(this.cookieService);
    this.lastCommitedAtFrom = Number(this.getValueFromCookie(BranchColumnId.LAST_COMMIT_DATETIME.concat('_from'))) || 0;
    this.lastCommitedAtTo = Number(this.getValueFromCookie(BranchColumnId.LAST_COMMIT_DATETIME.concat('_to'))) || 0;
  }

  ngOnInit() {
    this.setInitialValues();
    this.loadBranches();
    this.subscribeToChanges();

  }

  subscribeToChanges() {
    this.currentPageSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.itemsPerPageSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.sortOrderSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.sortColumnSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.useRegexSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.commonFilterSubject.pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    this.columns.forEach(column => {
      if (!this.columnSubjects[column.id]) {
        this.columnSubjects[column.id] = new Subject<void>();
      }
      this.columnSubjects[column.id].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
    });
    const selectedColumns = this.columns.filter(c => c.selected);
    this.selectedColumns = selectedColumns;
    this.columnsForm.setValue(selectedColumns)
  }

  loadBranches() {
    this.projectService.getBranches().subscribe(
      (data: Branch[]) => {
        this.branches = data ?? [];
        this.filteredData = [...this.branches];
        this.setMaxLastCommetedAt();
        this.setErrors();
        this.setPageSize();
        this.applyColumnWidths();
        this.applyFilters();
      }
    );
  }

  setMaxLastCommetedAt() {
    const dates = this.branches.map(b => new Date(b.lastCommitCreatedAt));
    const oldestDate = new Date(Math.min(...dates.map(date => date.getTime())));
    const daysBetween = getDays(oldestDate.toString());
    this.maxLastCommitedAtTo = daysBetween;
  }

  setInitialValues() {
    // current page number
    this.currentPage = Number(this.cookieService.getCookie(this.valueWithPrefix("page"))) || 1;

    // columns
    const selectedColumns = this.cookieService.getCookie(this.valueWithPrefix(COLUMNS));
    if (selectedColumns) {
      const selectedColumnIds = selectedColumns.split(",");
      this.columns.forEach(column => {
        column.selected = selectedColumnIds.includes(column.id);
      });
      const allSelected = this.getSelectedColumns().length;
      let all = this.columns.filter(c => c.id === BranchColumnId.ALL)[0];
      all.selected = allSelected - 1 === this.columns.length;
      this.selectedColumnIds = this.columns.filter(c => c.selected).map(c => c.id);
    }

    // sorting
    this.sortColumn = this.cookieService.getCookie(this.valueWithPrefix('sortBy')) || '';
    this.sortDirection = (this.cookieService.getCookie(this.valueWithPrefix('sortDest')) as 'asc' | 'desc') || DEFAULT_SORT_ORDER;
    const sortState: Sort = {active: this.sortColumn, direction: this.sortDirection};
    if (this.sort) {
      this.sort.active = sortState.active;
      this.sort.direction = sortState.direction;
      this.sort.sortChange.emit(sortState);
    }

    // use regex
    this.useRegex = this.cookieService.getCookie(this.valueWithPrefix('userRegex')) === 'true' || false;

    // params
    const projectId = this.route.snapshot.queryParams['projectId'];
    if (projectId) {
      this.saveToCookie('projectIdFilter', projectId);
    }
  }

  valueWithPrefix(value: string) {
    return PREFIX_COOKIE + value;
  }

  updateCookie() {
    if (this.currentPage !== undefined && this.currentPage !== null) {
      this.cookieService.setCookie(this.valueWithPrefix("page"), this.currentPage.toString());
    }
    if (this.itemsPerPage !== undefined && this.itemsPerPage !== null) {
      let number = this.itemsPerPage.toString();
      if (this.selectedItemsPerPageOption === 'custom') {
        number = this.customRowsPerPage;
      }
      if (this.selectedItemsPerPageOption === 'all') {
        number = this.selectedItemsPerPageOption;
      }
      this.cookieService.setCookie(this.valueWithPrefix("size"), number);
    }
    if (this.sortDirection !== undefined && this.sortDirection !== null) {
      this.cookieService.setCookie(this.valueWithPrefix("sortDest"), this.sortDirection.toString());
    }
    this.cookieService.setCookie(this.valueWithPrefix("sortBy"), this.sortColumn || '');

    // selected columns
    let selectedColumnIds = this.columns
      .filter(col => col.selected)
      .map(col => col.id).join(",");
    if (selectedColumnIds.length === 0) {
      selectedColumnIds = '';
    }
    this.cookieService.setCookie(this.valueWithPrefix(COLUMNS), selectedColumnIds);

    // selected errors
    const selectedErrors = this.errors
      .filter(error => error.selected)
      .map(error => error.code).join(",");
    this.cookieService.setCookie(this.valueWithPrefix(BranchColumnId.ERRORS), selectedErrors.length ? selectedErrors : '');
  }

  setErrors() {
    const errorMap = new Map<string, string>(); // Key: error code, Value: error message
    this.branches.forEach(branch => {
      if (Array.isArray(branch.errors)) {
        branch.errors.forEach(error => {
          if (error.code && error.message) {
            errorMap.set(error.code, error.message);
          }
        });
      }
    });
    errorMap.set(ALL, 'All errors');

    const cookiedErrors = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.ERRORS))?.split(',') || [];
    for (const [code, message] of errorMap) {
      const possibleError: Error = {
        code: code,
        message: message,
        selected: cookiedErrors.includes(code) || cookiedErrors.includes(ALL)
      };

      this.errorSubjects[possibleError.code] = new Subject<void>();
      this.errorSubjects[possibleError.code].pipe(takeUntil(this.destroy$)).subscribe(() => this.updateCookie());
      this.errors.push(possibleError);
    }
    const selectedErrors = this.errors.filter(e => e.selected) || [];
    this.errorForm.setValue(selectedErrors);
  }

  setPageSize() {
    const itemsPerPageCookie = this.cookieService.getCookie(this.valueWithPrefix("size"));
    if (itemsPerPageCookie) {
      if (itemsPerPageCookie === 'all') {
        this.selectedItemsPerPageOption = itemsPerPageCookie;
      } else {
        const parsedValue = Number(itemsPerPageCookie);
        if (this.itemsPerPageOptions.includes(parsedValue)) {
          this.selectedItemsPerPageOption = isNaN(parsedValue) ? DEFAULT_ITEMS_PER_PAGE : parsedValue;
        } else {
          this.selectedItemsPerPageOption = 'custom';
          this.customRowsPerPage = parsedValue;
        }
      }
    } else {
      this.selectedItemsPerPageOption = this.itemsPerPageOptions[0];
    }

    if (this.selectedItemsPerPageOption === 'all') {
      this.itemsPerPage = this.filteredData.length;
    }
    if (this.selectedItemsPerPageOption === 'custom') {
      this.itemsPerPage = this.customRowsPerPage;
    }
    if (typeof this.selectedItemsPerPageOption === 'number') {
      this.itemsPerPage = this.selectedItemsPerPageOption;
    }
  }

  applyColumnWidths() {
    const totalWidth = window.innerWidth;
    const defaultWidth = totalWidth / this.selectedColumns.length + 1;
    let columns = this.selectedColumns.map(c => c.id.toString()) ?? [];
    columns.push('actions');
    columns.forEach(id => {
      const savedWidth = this.getWidthFromCookie(id);
      const width = savedWidth ? `${savedWidth}px` : `${defaultWidth}px`;
      const columnElement = document.getElementById(id);
      if (columnElement) {
        columnElement.style.width = width;
      }
    });
  }

  getWidthFromCookie(columnId: string): number | null {
    const cookieValue = this.cookieService.getCookie(`${PREFIX_COOKIE}${columnId}_width`);
    return cookieValue ? parseInt(cookieValue, 10) : null;
  }

  getTotalPages() {
    return this.itemsPerPage === 'all'
      ? 1
      : Math.ceil(this.filteredData.length / (this.itemsPerPage as number));
  }

  toggleDropdown(type: DropdownType) {
    this.dropdownState[type] = !this.dropdownState[type];
  }

  toggleColumnSelection(columnId: string): void {
    const column = this.columns.find(col => col.id === columnId);
    if (column) {
      column.selected = !column.selected;
      if (column.id === BranchColumnId.ALL) {
        this.columns.every(e => e.selected = column.selected);
        this.columnsForm.setValue(column.selected ? this.columns : []);
      } else {
        const allSelected = this.columns
          .filter(t => t.id !== BranchColumnId.ALL)
          .map(t => t.selected);
        const areAllSelectedSame = new Set(allSelected).size === 1;
        let all = this.columns
          .filter(t => t.id === BranchColumnId.ALL)[0];
        if (areAllSelectedSame) {
          all.selected = allSelected[0];
        } else {
          all.selected = false;
        }
        const selectedColumns = this.columns.filter(t => t.selected) || [];
        this.columnsForm.setValue(selectedColumns)
      }
      this.columnSubjects[columnId].next();
      const updatedColumns = this.getSelectedColumns();
      this.selectedColumns = [...updatedColumns];
      this.selectedColumnIds = this.selectedColumns.map(c => c.id);
    }
  }

  toggleErrorSelection(code: string): void {
    const error = this.errors.find(e => e.code === code);
    if (error) {
      error.selected = !error.selected;
      if (error.code === ALL) {
        this.errors.every(e => e.selected = error.selected);
        this.errorForm.setValue(error.selected ? this.errors : []);
      } else {
        const allSelected = this.errors
          .filter(t => t.code !== ALL)
          .map(t => t.selected);
        const areAllSelectedSame = new Set(allSelected).size === 1;
        let all = this.errors
          .filter(t => t.code === ALL)[0];
        if (areAllSelectedSame) {
          all.selected = allSelected[0];
        } else {
          all.selected = false;
        }
        const selected = this.errors.filter(t => t.selected) || [];
        this.errorForm.setValue(selected)
      }
      this.errorSubjects[code].next();
      const updated = this.getSelectedErrors();
      this.selectedErrors = [...updated];
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
    if (newPage > 0 && newPage <= this.getTotalPages()) {
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
        if (columnId === BranchColumnId.LAST_COMMIT_DATETIME) {
          this.filteredData.sort((a, b) => {
            const valueA = this.getRowValue(a, columnId);
            const valueB = this.getRowValue(b, columnId);
            const numA = Number(valueA);
            const numB = Number(valueB);
            if (isNaN(numA) && isNaN(numB)) return 0;
            if (isNaN(numA)) return 1;
            if (isNaN(numB)) return -1
            return (numA - numB) * (dist === 'asc' ? 1 : -1);
          });
        } else if (columnId !== BranchColumnId.ERRORS) {
          this.filteredData.sort((a, b) => {
            const valueA = this.getRowValue(a, columnId)?.toString().toLowerCase() ?? '';
            const valueB = this.getRowValue(b, columnId)?.toString().toLowerCase() ?? '';
            return (valueA > valueB ? 1 : -1) * (dist === 'asc' ? 1 : -1);
          });
        } else {
          this.filteredData.sort((a, b) => {
            const errorsA = this.getErrorValues(a);
            const errorsB = this.getErrorValues(b);
            const codesA = errorsA.map(e => e.code).join('');
            const codesB = errorsB.map(e => e.code).join('');
            if (codesA.length === 0 && codesB.length === 0) return 0;
            return (codesA > codesB ? 1 : -1) * (dist === 'asc' ? 1 : -1);
          });
        }
      }
    }
    
    // todo
    // always branches with null values for this columnId pass to the end

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
      this.currentPage = this.getTotalPages()
    }
    if (startIndex < 1) {
      startIndex = 0;
    }
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  getRowValue(branch: Branch, columnId: string): string {
    return this.displayTextUtils.getBranchRowValue(branch, columnId);
  }

  // getErrorValues(branch: Branch): ModelError[] {
  //   return branch.errors?.sort((a, b) => a.code.localeCompare(b.code)) ?? [];
  // }

  getErrorValues(branch: Branch): ModelError[] {
    let errors: ModelError[] = branch.errors ?? [];
    errors.sort((a, b) => a.code.localeCompare(b.code));
    return errors;
  }

  getErrors(branch: Branch): string {
    return this.displayTextUtils.getErrors(branch);
  }

  applyFilters() {
    const projectFilter = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.PROJECT)) || '';
    const nameFilter = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.BRANCH_NAME)) || '';
    const artifactIdFilter = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.ARTIFACT_ID)) || '';
    const groupIdFilter = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.GROUP_ID)) || '';
    const lastActivityFilterFrom = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.LAST_COMMIT_DATETIME).concat('_from')) || null;
    const lastActivityFilterTo = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.LAST_COMMIT_DATETIME).concat('_to')) || null;
    const revisionFilter = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.REVISION)) || '';
    const commonFilter = this.cookieService.getCookie(this.valueWithPrefix(COMMON_FILTER)) || '';
    const useRegex = this.cookieService.getCookie(this.valueWithPrefix('useRegex')) === 'true';
    let selectedErrors = this.getSelectedErrors();
    const allErrors = selectedErrors.filter(e => e.code === ALL).length > 0;

    this.filteredData = this.branches.filter(branch => {
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
          return value?.toLowerCase().includes(filter.toLowerCase()) || filter === '';
        }
      };

      const matchesProjectName = matchesRegexOrIncludes(branch.projectName, projectFilter);
      const matchesName = matchesRegexOrIncludes(branch.name, nameFilter);
      const matchesArtifactId = matchesRegexOrIncludes(branch.artifactId ?? '', artifactIdFilter);
      const matchesGroupId = matchesRegexOrIncludes(branch.groupId ?? '', groupIdFilter);
      const matchesLastActivity = this.numberInInterval(getDays(branch.lastCommitCreatedAt).toString(), lastActivityFilterFrom, lastActivityFilterTo);
      const matchesRevision = matchesRegexOrIncludes(branch.revision ?? '', revisionFilter);
      const branchErrors = this.getErrors(branch) ?? [];
      let errors = branchErrors.split(',').filter(error => error.trim() !== '') ?? [];
      const matchesErrors = allErrors || selectedErrors.length === 0 || this.isErrorsSelected(errors, selectedErrors);
      const matchesCommonFilter = this.isCommonFilterMatched(branch, commonFilter.toLowerCase());

      // from params
      const projectId = this.route.snapshot.queryParams['projectId'];
      const matchesProjectId = projectId == null || branch.projectId.toString() === projectId;

      return (
        matchesProjectName &&
        matchesName &&
        matchesArtifactId &&
        matchesGroupId &&
        matchesLastActivity &&
        matchesRevision &&
        matchesErrors &&
        matchesCommonFilter &&
        matchesProjectId
      );
    });
    const sortBy = this.cookieService.getCookie(this.valueWithPrefix('sortBy'));
    const sortDest = this.cookieService.getCookie(this.valueWithPrefix('sortDest'));
    this.sortData(sortBy, sortDest);
  }

  numberInInterval(numberPlain: string, from: string | null, to: string | null) {
    const min = from === null ? 0 : Number(from);
    const max = to === null ? Number.MAX_SAFE_INTEGER : Number(to);
    const num = Number(numberPlain);
    return num >= min && num <= max;
  }

  isCommonFilterMatched(branch: Branch, commonFilter: string): boolean {
    // const propertiesToCheck: string[] = [
    //   branch.name,
    //   branch.url,
    //   branch.description ?? '',
    //   branch.cicd?.configurationFile ?? '',
    //   this.getErrors(project)
    // ];
    // const checkMinProps = this.filter(propertiesToCheck, commonFilter);
    // if (checkMinProps) {
    //   return checkMinProps;
    // }
    //
    // const variables = project.cicd.variables;
    // for (const key in variables) {
    //   if (variables.hasOwnProperty(key)) {
    //     const keyIncl = key.toLowerCase().includes(commonFilter);
    //     const valueIncl = variables[key].toLowerCase().includes(commonFilter);
    //     if (keyIncl || valueIncl) {
    //       return true;
    //     }
    //   }
    // }
    //
    // const branches = project.branches;
    // for (let i = 0; i < branches.length; i++) {
    //   const branch = branches[i];
    //   const toCheck = [
    //     branch.projectId,
    //     branch.projectName,
    //     branch.name,
    //     branch.url,
    //     branch.lastCommitCreatedAt,
    //     branch.gitLabConfig,
    //     branch.groupId,
    //     branch.artifactId,
    //     branch.revision,
    //     branch.parent?.artifactId,
    //     branch.parent?.version,
    //     this.getErrors(project)
    //   ];
    //   const checkBranchProps = this.filter(toCheck, commonFilter);
    //   if (checkBranchProps) {
    //     return checkBranchProps;
    //   }
    // }

    // return false;
    return true;
  }

  filter(propertiesToCheck: any[], filter: string) {
    for (const prop of propertiesToCheck) {
      if (prop?.toLowerCase().includes(filter)) {
        return true;
      }
    }
    return false;
  }

  isErrorsSelected(errors: string[], selectedErrors: Error[]) {
    if (selectedErrors.length === 0) {
      return true;
    }
    const trimmedErrors = errors.map(error => error.trim());
    for (let i = 0; i < selectedErrors.length; i++) {
      const selectedError = selectedErrors[i].code.trim();
      const isSelected = trimmedErrors.includes(selectedError);
      if (!isSelected) {
        return false;
      }
    }
    return true;
  }

  getSelectedColumns() {
    if (this.columnsForm.value === null) {
      return [];
    }
    return this.columnsForm.value.filter((c: Column) => c.selected && c.id !== BranchColumnId.ALL);
  }

  getSelectedErrors() {
    const errors = this.errorForm.value;
    if (errors == null) {
      return [];
    }
    return this.errorForm.value.filter((e: Error) => e.selected && e.code !== ALL);
  }

  getSelectedErrorCodes() {
    const saved = this.cookieService.getCookie(this.valueWithPrefix(BranchColumnId.ERRORS))?.split(',') ?? [];
    if (saved.includes(ALL)) {
      return ALL;
    }
    return this.errors.filter(e => e.code !== ALL && e.selected).map(e => e.code).join(',');
  }

  onCustomRowsChange(event: any): void {
    const customValue = parseInt(event.target.value, 10);
    if (customValue >= 0) {
      this.customRowsPerPage = customValue;
      this.itemsPerPage = customValue;
      this.itemsPerPageSubject.next(this.itemsPerPage);
      this.updatePaginatedData();
    }
  }

  getValueFromCookie(columnId: string) {
    return this.cookieService.getCookie(this.valueWithPrefix(columnId));
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
    this.cookieService.setCookie(this.valueWithPrefix(id), element.value);
    this.applyFilters();
  }

  useRegexChange(event: MatCheckboxChange) {
    this.useRegex = event.checked;
    this.useRegexSubject.next(this.useRegex);
    this.cookieService.setCookie(this.valueWithPrefix("useRegex"), this.useRegex);
    this.applyFilters();
  }

  getUseRegex(): boolean {
    const useRegexFromCookie = this.getValueFromCookie(this.valueWithPrefix('useRegex'));
    return useRegexFromCookie === 'true' ? true : false;
  }

  saveToCookie(key: any, value: string): void {
    this.cookieService.setCookie(this.valueWithPrefix(key), value)
    this.applyFilters()
  }

  applyCommonFilter(filter: string) {
    this.saveToCookie(COMMON_FILTER, filter);
    this.commonFilterSubject.next(filter);
  }

  highlightText(rowValue: string, id: any) {
    return this.displayTextUtils.highlight(PREFIX_COOKIE, rowValue, id, this.useRegex);
  }

  higlightError(error: ModelError) {
    return this.displayTextUtils.highlightError(PREFIX_COOKIE, error)
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onColumnResize(event: Event, columnId: BranchColumnId) {
    const target = event.target as HTMLElement;
    const width = target.style.width;
    if (width) {
      this.saveToCookie(PREFIX_COOKIE + columnId + '_width', width);
    }
  }

  protected readonly Number = Number;

  getProjectUrl(branch: Branch) {
    const branchUrl = branch.url;
    return branchUrl.replace('/-/tree/'.concat(branch.name), '');
  }

  resetFileters() {
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.PROJECT));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.BRANCH_NAME));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.ARTIFACT_ID));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.GROUP_ID));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.REVISION));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.JDK));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.LAST_COMMIT_DATETIME).concat('_from'));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(BranchColumnId.LAST_COMMIT_DATETIME).concat('_to'));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat('errors'));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat(COMMON_FILTER));
    this.cookieService.deleteCookie(PREFIX_COOKIE.concat('useRegex'));
    this.router.navigate(['/branches']);
    this.filteredData = this.branches;
    this.selectedErrors = [];
    this.errorForm.setValue([])
    this.applyFilters();
  }

}
