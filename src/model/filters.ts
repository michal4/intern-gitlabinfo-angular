// Assuming ColumnId is already defined as an enum
export enum ArchivedType {
  ALL = 'All projects',
  ARCHIVED = 'Archived projects',
  LIVE = 'Live projects'
}
// <- @hejny Using enums is not a good idea, use @see https://www.youtube.com/watch?v=jjMbPt_H3RQ

export interface Filter {
//      <- @hejny Decide between types and interfaces and probbably use types @see https://www.youtube.com/watch?v=zM9UPcIyyhQ
  name: string;
  selected: boolean;
}

export const archivedSelectSettings: Record<ArchivedType, Filter> = {
  [ArchivedType.ALL]: {
    name: ArchivedType.ALL,
    selected: true,
  },
  [ArchivedType.ARCHIVED]: {
    name: ArchivedType.ARCHIVED,
    selected: true,
  },
  [ArchivedType.LIVE]: {
    name: ArchivedType.LIVE,
    selected: true,
  }
};
