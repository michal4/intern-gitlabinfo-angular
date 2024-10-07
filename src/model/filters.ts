// Assuming ColumnId is already defined as an enum
export enum ArchivedType {
  ALL = 'All projects',
  ARCHIVED = 'Archived projects',
  LIVE = 'Live projects'
}

export interface Filter {
  name: string;
  selected: boolean;
}

export const archivedSelectSettings: Record<ArchivedType, Filter> = {
  [ArchivedType.ALL]: {
    name: ArchivedType.ALL,
    selected: false,
  },
  [ArchivedType.ARCHIVED]: {
    name: ArchivedType.ARCHIVED,
    selected: false,
  },
  [ArchivedType.LIVE]: {
    name: ArchivedType.LIVE,
    selected: false,
  }
};
