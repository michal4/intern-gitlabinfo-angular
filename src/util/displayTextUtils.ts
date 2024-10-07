import { GitLabProject } from 'intern-gitlabinfo-openapi-angular';
import {ColumnId} from '../model/column-id.enum';
import {CookieService} from '../service/cookie.service';

export class DisplayTextUtils {

  constructor(private cookieService: CookieService) {
  }

  highlight(text: string, columnId: string, useRegex: boolean): string {
    if (text === '') {
      return text;
    }

    const searchValue = this.cookieService.getCookie(columnId);
    const commonFilter = this.cookieService.getCookie('commonFilter');
    if (!searchValue && !commonFilter) {
      return text;
    }

    if (columnId === ColumnId.kinds) {
      return searchValue?.includes(text) ? `<mark style="background-color: yellow;">${text}</mark>` : text;
    }
    if (columnId === ColumnId.errors) {
      const selectedErrors = searchValue?.trim().split(',').filter(item => item !== '');
      const curErrors = text?.replace(/\s+/g, '').split(',').filter(item => item !== '');

      const highlightedErrors = curErrors.map((curErr, i) => {
        const isHighlighted = selectedErrors?.includes(curErr);
        return isHighlighted
          ? `<mark style="background-color: yellow;">${curErr}</mark>`
          : curErr;
      });

      return highlightedErrors.join(',');
    }

    let highlightedText = text;
    if (commonFilter) {
      let searchRegex;
      if (useRegex) {
        try {
          searchRegex = new RegExp(commonFilter, 'gi');
        } catch (error) {
          console.error('Invalid regex pattern:', commonFilter);
        }
      } else {
        searchRegex = new RegExp(`(${commonFilter.split(',').join('|')})`, 'gi');
        highlightedText = highlightedText.replace(searchRegex, `<mark style="background-color: yellow;">$1</mark>`);
      }
    }
    if (searchValue) {
      let searchRegex;
      if (useRegex) {
        try {
          searchRegex = new RegExp(searchValue, 'gi');
        } catch (error) {
          console.error('Invalid regex pattern:', searchValue);
        }
      } else {
        searchRegex = new RegExp(`(${searchValue.split(',').join('|')})`, 'gi');
        highlightedText = highlightedText.replace(searchRegex, `<mark style="background-color: yellow;">$1</mark>`);
      }
    }

    return highlightedText;
  }

  getRowValue(project: GitLabProject, columnId: string): string {
    switch (columnId) {
      case ColumnId.defaultBranch:
        return project.defaultBranch?.name ?? '';
      case ColumnId.parentArtifactId:
        return project.defaultBranch?.parent?.artifactId ?? '';
      case ColumnId.parentVersion:
        return project.defaultBranch?.parent?.version ?? '';
      case ColumnId.kinds:
        return project.kind;
      default:
        return project[columnId as keyof GitLabProject]?.toString() ?? '';
    }
  }

  getErrors(row: GitLabProject) {
    const projectErrors = this.formatErrors(row.errors || []);
    const branchErrors = this.formatErrors(row.defaultBranch?.errors || []);
    if (projectErrors.length === 0) {
      return branchErrors.length > 0 ? branchErrors.concat(', ') : '';
    }
    return [projectErrors, branchErrors].join(', ') || '';
  }

  formatErrors(errors: any[]): string {
    return Array.isArray(errors) ? errors.map(e => e.code).join(', ') : '';
  }

}
