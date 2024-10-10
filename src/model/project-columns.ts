export const enum ProjectColumnId {
  NAME = "name",
  DEFAULT_BRANCH = "defaultBranch",
  PARENT_ARTIFACT_ID = "parentArtifactId",
  PARENT_VERSION = "parentVersion",
  ERRORS = "errors",
  KINDS = "kinds",
  DESCRIPTION = "description",
  ALL = "all",
}

// Define the Column interface
export interface Column {
  id: ProjectColumnId;
  label: string;
  selected: boolean;
}

// Function to create a column object
const createColumn = (id: ProjectColumnId, label: string): Column => ({
  id,
  label,
  selected: true,
});

// Create the columnSettings object using the Column interface
export const columnSettings: Record<ProjectColumnId, Column> = {
  [ProjectColumnId.NAME]: createColumn(ProjectColumnId.NAME, "Name"),
  [ProjectColumnId.DEFAULT_BRANCH]: createColumn(ProjectColumnId.DEFAULT_BRANCH, "Default Branch"),
  [ProjectColumnId.PARENT_ARTIFACT_ID]: createColumn(ProjectColumnId.PARENT_ARTIFACT_ID, "Parent Artifact Id"),
  [ProjectColumnId.PARENT_VERSION]: createColumn(ProjectColumnId.PARENT_VERSION, "Parent Version"),
  [ProjectColumnId.ERRORS]: createColumn(ProjectColumnId.ERRORS, "Errors"),
  [ProjectColumnId.KINDS]: createColumn(ProjectColumnId.KINDS, "Kinds"),
  [ProjectColumnId.DESCRIPTION]: createColumn(ProjectColumnId.DESCRIPTION, "Description"),
  [ProjectColumnId.ALL]: createColumn(ProjectColumnId.ALL, "All"),
};
