export interface ProjectDataModel {
  id: number;
  name: string;
  defaultBranch: string;
  parentArtifactId: string;
  parentVersion: string;
  error: string;
  description: string;
}
