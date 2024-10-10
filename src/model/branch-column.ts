export const enum BranchColumnId {
  PROJECT = "projectName",
  BRANCH_NAME = "name",
  ARTIFACT_ID = "artifactId",
  GROUP_ID = "groupId",
  REVISION = "revision",
  JDK = "jdk",
  LAST_COMMIT_DATETIME = "lastCommitCreatedAt",
  ERRORS = "errors",
  ALL = "all",
}

// Define the Column interface
export interface Column {
  id: BranchColumnId;
  label: string;
  selected: boolean;
}

// Function to create a column object
const createColumn = (id: BranchColumnId, label: string): Column => ({
  id,
  label,
  selected: true,
});

// Create the columnSettings object using the Column interface
export const columnSettings: Record<BranchColumnId, Column> = {
  [BranchColumnId.PROJECT]: createColumn(BranchColumnId.PROJECT, "Project"),
  [BranchColumnId.BRANCH_NAME]: createColumn(BranchColumnId.BRANCH_NAME, "Name"),
  [BranchColumnId.ARTIFACT_ID]: createColumn(BranchColumnId.ARTIFACT_ID, "Artifact Id"),
  [BranchColumnId.GROUP_ID]: createColumn(BranchColumnId.GROUP_ID, "Group Id"),
  [BranchColumnId.LAST_COMMIT_DATETIME]: createColumn(BranchColumnId.LAST_COMMIT_DATETIME, "Last activity"),
  [BranchColumnId.REVISION]: createColumn(BranchColumnId.REVISION, "Revision"),
  [BranchColumnId.JDK]: createColumn(BranchColumnId.JDK, "jdk"),
  [BranchColumnId.ERRORS]: createColumn(BranchColumnId.ERRORS, "Errors"),
  [BranchColumnId.ALL]: createColumn(BranchColumnId.ALL, "All"),
};