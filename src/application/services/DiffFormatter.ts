import { minimatch } from "minimatch";
import type { DiffFile } from "@supaproxy/viper-vcs-providers";

export class DiffFormatter {
  static filterIgnored(files: DiffFile[], ignorePatterns: string[]): DiffFile[] {
    if (ignorePatterns.length === 0) return files;

    return files.filter((file) => {
      const path = file.newPath || file.oldPath;
      return !ignorePatterns.some((pattern) => minimatch(path, pattern));
    });
  }

  static format(files: DiffFile[]): string {
    return files
      .map((f) => {
        const header = f.isDeleted
          ? `--- a/${f.oldPath}\n+++ /dev/null`
          : f.isNew
            ? `--- /dev/null\n+++ b/${f.newPath}`
            : `--- a/${f.oldPath}\n+++ b/${f.newPath}`;
        return `${header}\n${f.diff}`;
      })
      .join("\n\n");
  }
}
