export interface RespondToDiscussionDTO {
  projectId: number;
  mrIid: number;
  discussionId: string;
  noteBody: string;
  noteAuthorId: number;
  sourceBranch: string;
  botUserId: number | null;
}
