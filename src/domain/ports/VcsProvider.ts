/**
 * Port: Version Control System Provider
 *
 * Abstract interface for VCS operations. Infrastructure adapters (GitLab, GitHub)
 * implement this port. The domain and application layers never depend on a
 * specific VCS — they depend on this contract.
 */

export interface DiffFile {
  oldPath: string;
  newPath: string;
  diff: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
}

export interface DiffVersion {
  baseSha: string;
  startSha: string;
  headSha: string;
}

export interface MergeRequestInfo {
  projectId: number;
  iid: number;
  title: string;
  description: string | null;
  sourceBranch: string;
  targetBranch: string;
  authorId: number;
  url: string;
}

export interface Discussion {
  id: string;
  notes: DiscussionNote[];
}

export interface DiscussionNote {
  id: number;
  body: string;
  authorId: number;
  authorUsername: string;
  resolved: boolean;
  filePath?: string;
  line?: number;
}

export interface InlineCommentPosition {
  baseSha: string;
  startSha: string;
  headSha: string;
  filePath: string;
  line: number;
}

export interface VcsProvider {
  getMergeRequestDiff(projectId: number, mrIid: number): Promise<DiffFile[]>;
  getMergeRequestVersion(projectId: number, mrIid: number): Promise<DiffVersion | null>;
  getDiscussions(projectId: number, mrIid: number): Promise<Discussion[]>;
  createInlineComment(
    projectId: number,
    mrIid: number,
    body: string,
    position: InlineCommentPosition
  ): Promise<void>;
  createComment(projectId: number, mrIid: number, body: string): Promise<void>;
  replyToDiscussion(
    projectId: number,
    mrIid: number,
    discussionId: string,
    body: string
  ): Promise<void>;
  resolveDiscussion(
    projectId: number,
    mrIid: number,
    discussionId: string,
    resolved: boolean
  ): Promise<void>;
  getFileContent(projectId: number, filePath: string, ref: string): Promise<string | null>;
}
