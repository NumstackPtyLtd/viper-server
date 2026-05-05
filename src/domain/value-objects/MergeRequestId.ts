export class MergeRequestId {
  private constructor(
    private readonly projectId: number,
    private readonly iid: number
  ) {}

  static create(projectId: number, iid: number): MergeRequestId {
    if (!Number.isInteger(projectId) || projectId < 1) {
      throw new Error("projectId must be a positive integer");
    }
    if (!Number.isInteger(iid) || iid < 1) {
      throw new Error("MR iid must be a positive integer");
    }
    return new MergeRequestId(projectId, iid);
  }

  getProjectId(): number {
    return this.projectId;
  }

  getIid(): number {
    return this.iid;
  }

  toString(): string {
    return `${this.projectId}!${this.iid}`;
  }

  equals(other: MergeRequestId): boolean {
    return this.projectId === other.projectId && this.iid === other.iid;
  }
}
