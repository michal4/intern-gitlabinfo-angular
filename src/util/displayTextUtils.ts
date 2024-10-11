import {Branch, GitLabProject, ModelError} from 'intern-gitlabinfo-openapi-angular';
import {ProjectColumnId} from '../model/project-columns';
import {BranchColumnId} from '../model/branch-column';
import {CookieService} from '../service/cookie.service';

export class DisplayTextUtils {

  constructor(private cookieService: CookieService) {
  }

  highlight(cookiePrefix: string, text: string, columnId: string, useRegex: boolean): string {
    if (text === '' || columnId === ProjectColumnId.KINDS) {
      return text;
    }

    let searchValue = this.cookieService.getCookie(cookiePrefix + columnId);
    const commonFilter = this.cookieService.getCookie(cookiePrefix + 'commonFilter');
    if (!searchValue && !commonFilter) {
      return text;
    }
    if (searchValue && commonFilter) {
      const commonPart = this.getCommonSubstring(commonFilter ?? '', searchValue, text);
      if (!useRegex) {
        if (commonPart) {
          const booleans: boolean[] = Array.from(text).map(char => {
            return commonFilter.includes(char) || searchValue.includes(char);
          });
          const substr = this.getTrueSubstrings(text, booleans).toString();
          const searchRegex = new RegExp(`(${substr.split(',').join('|')})`, 'gi');
          return text.replace(searchRegex, `<mark style="background-color: yellow;">$1</mark>`);
        } else {
          const combinedPattern = `(${commonFilter}|${searchValue})`;
          const searchRegex = new RegExp(combinedPattern, 'gi');
          return text.replace(searchRegex, `<mark style="background-color: yellow;">$1</mark>`);
        }
      }
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

  getCommonSubstring(str1: string, str2: string, common: string): string | null {
    const startIndex1 = common.indexOf(str1)
    const endIndex1 = startIndex1 + str1.length;
    const startIndex2 = common.indexOf(str2)
    const endIndex2 = startIndex2 + str2.length;
    const overlap = startIndex1 < endIndex2 && startIndex2 < endIndex1;
    if (!overlap) {
      return null;
    }

    let commonPart = '';
    const getSubstrings = (str: string): string[] => {
      const substrings: string[] = [];
      const length = str.length;
      for (let start = 0; start < length; start++) {
        for (let end = start + 1; end <= length; end++) {
          substrings.push(str.slice(start, end));
        }
      }
      return substrings;
    };
    const substringsStr1 = getSubstrings(str1);
    for (const substring of substringsStr1) {
      if (str2.includes(substring) && common.includes(substring)) {
        if (substring.length > commonPart.length) {
          commonPart = substring;
        }
      }
    }

    return commonPart.length > 0 ? commonPart : null;
  }

  getTrueSubstrings(text: string, charArray: boolean[]): string[] {
    const substrings: string[] = [];
    let currentSubstring: string = "";

    for (let i = 0; i < charArray.length; i++) {
      if (charArray[i]) {
        currentSubstring += text[i];
      } else {
        if (currentSubstring) {
          substrings.push(currentSubstring);
          currentSubstring = "";
        }
      }
    }

    if (currentSubstring) {
      substrings.push(currentSubstring);
    }

    return substrings;
  }

  highlightError(cookiePrefix: string, error: ModelError) {
    const selectedErrosPlain = this.cookieService.getCookie(cookiePrefix.concat(ProjectColumnId.ERRORS));
    if (!selectedErrosPlain) {
      return error.code;
    }
    const selectedErros = selectedErrosPlain.split(',');
    if (selectedErros.includes(error.code)) {
      return `<mark style="background-color: yellow;">${error.code}</mark>`;
    }
    return error.code;
  }

  getBranchRowValue(branch: Branch, columnId: string): string {
    switch (columnId) {
      case BranchColumnId.PROJECT:
        return branch.projectName ?? '';
      case BranchColumnId.LAST_COMMIT_DATETIME:
        return getDays(branch.lastCommitCreatedAt).toString();
      default:
        return branch[columnId as keyof Branch]?.toString() ?? '';
    }
  }

  getProjectRowValue(project: GitLabProject, columnId: string): string {
    switch (columnId) {
      case ProjectColumnId.DEFAULT_BRANCH:
        return project.defaultBranch?.name ?? '';
      case ProjectColumnId.PARENT_ARTIFACT_ID:
        return project.defaultBranch?.parent?.artifactId ?? '';
      case ProjectColumnId.PARENT_VERSION:
        return project.defaultBranch?.parent?.version ?? '';
      case ProjectColumnId.KINDS:
        return project.kind;
      default:
        return project[columnId as keyof GitLabProject]?.toString() ?? '';
    }
  }

  getErrors(row: any) {
    const parentErrors = this.formatErrors(row.errors || []);
    const childrenErrors = this.formatErrors(row.defaultBranch?.errors || []);
    if (parentErrors.length === 0) {
      return childrenErrors.length > 0 ? childrenErrors.concat(', ') : '';
    }
    return [parentErrors, childrenErrors].join(', ') || '';
  }

  formatErrors(errors: any[]): string {
    return Array.isArray(errors) ? errors.map(e => e.code).join(', ') : '';
  }

}

export function getDays(lastCommitCreatedAt: string): number {
  const lastCommitDate = new Date(lastCommitCreatedAt);
  const currentDate = new Date();
  const differenceInMillis = currentDate.getTime() - lastCommitDate.getTime();
  return Math.floor(differenceInMillis / (1000 * 60 * 60 * 24));
}
