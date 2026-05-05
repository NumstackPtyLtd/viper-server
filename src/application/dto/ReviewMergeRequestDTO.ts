export interface ReviewMergeRequestDTO {
  projectId: number;
  mrIid: number;
  title: string;
  description: string | null;
  sourceBranch: string;
  targetBranch: string;
}
