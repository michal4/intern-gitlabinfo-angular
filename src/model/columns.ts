// Assuming ColumnId is already defined as an enum
export const enum ColumnId {
  NAME = "name",
  DEFAULT_BRANCH = "defaultBranch",
  PARENT_ARTIFACT_ID = "parentArtifactId",
  PARENT_VERSION = "parentVersion",
  ERRORS = "errors",
  KINDS = "kinds",
  DESCRIPTION = "description",
  ALL = "all"
}

// Define the Column interface
export interface Column {
  id: ColumnId;
  label: string;
  selected: boolean;
}

// Create the columnSettings object using the Column interface
export const columnSettings: Record<ColumnId, Column> = {
  [ColumnId.NAME]: {
    id: ColumnId.NAME,
    label: "Name",
    selected: true,
  },
  [ColumnId.DEFAULT_BRANCH]: {
    id: ColumnId.DEFAULT_BRANCH,
    label: "Default Branch",
    selected: true,
  },
  [ColumnId.PARENT_ARTIFACT_ID]: {
    id: ColumnId.PARENT_ARTIFACT_ID,
    label: "Parent ArtifactId",
    selected: true,
  },
  [ColumnId.PARENT_VERSION]: {
    id: ColumnId.PARENT_VERSION,
    label: "Parent Version",
    selected: true,
  },
  [ColumnId.ERRORS]: {
    id: ColumnId.ERRORS,
    label: "Errors",
    selected: true,
  },
  [ColumnId.KINDS]: {
    id: ColumnId.KINDS,
    label: "Kinds",
    selected: true,
  },
  [ColumnId.DESCRIPTION]: {
    id: ColumnId.DESCRIPTION,
    label: "Description",
    selected: true,
  },
  [ColumnId.ALL]: {
    id: ColumnId.ALL,
    label: "All",
    selected: true,
  },
};
