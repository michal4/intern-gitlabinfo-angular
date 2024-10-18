export const enum BranchColumnId {
  PROJECT = "projectName",
  BRANCH_NAME = "name",
  ARTIFACT_ID = "artifactId",
  GROUP_ID = "groupId",
  REVISION = "revision",
  JDK = "jdks",
  LAST_COMMIT_DATETIME = "lastCommitCreatedAt",
  ERRORS = "errors",
  ALL = "all",
}
// <- @hejny Using enums is not a good idea, use
const _BranchColumnIds = ['projectName','name','artifactId'/* ... */] as const;
type _BranchColumnId = typeof _BranchColumnIds[number];
// @see https://www.youtube.com/watch?v=jjMbPt_H3RQ


/**
 * Define the Column interface
 * 
 * <- @hejny Use jsdoc
 */
export interface Column {
  //   <- @hejny Decide between types and interfaces and probbably use types @see https://www.youtube.com/watch?v=zM9UPcIyyhQ
  id: BranchColumnId;
  label: string;
  selected: boolean;
}

/**
 * Function to create a column object
 * 
 * @param id ...
 * @param label ...
 * @returns ...
 * 
 * <- @hejny Use jsdoc
 */
function createColumn(id: BranchColumnId, label: string): Column {
    return({
      id,
      label,
      selected: true,
    })
};
// <- @hejny Decide between functions as const vs hoisted functions (I prefer hoisted functions for multiple reasons)
//           @see https://dev.to/skinnypetethegiraffe/function-or-const-which-do-you-prefer-typescriptjavascript-apa



/**
 * Create the columnSettings object using the Column interface
 */
export const columnSettings = {
  [BranchColumnId.PROJECT]: createColumn(BranchColumnId.PROJECT, "Project"),
  [BranchColumnId.BRANCH_NAME]: createColumn(BranchColumnId.BRANCH_NAME, "Name"),
  [BranchColumnId.ARTIFACT_ID]: createColumn(BranchColumnId.ARTIFACT_ID, "Artifact Id"),
  [BranchColumnId.GROUP_ID]: createColumn(BranchColumnId.GROUP_ID, "Group Id"),
  [BranchColumnId.REVISION]: createColumn(BranchColumnId.REVISION, "Revision"),
  [BranchColumnId.JDK]: createColumn(BranchColumnId.JDK, "jdk"),
  [BranchColumnId.LAST_COMMIT_DATETIME]: createColumn(BranchColumnId.LAST_COMMIT_DATETIME, "Last activity"),
  [BranchColumnId.ERRORS]: createColumn(BranchColumnId.ERRORS, "Errors"),
  [BranchColumnId.ALL]: createColumn(BranchColumnId.ALL, "All")
} satisfies Record<BranchColumnId, Column>;
// <- @hejny Decide between explicit typing vs satisfies (I prefer satisfies it much better serves the purpose)

