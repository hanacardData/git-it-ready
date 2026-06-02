/**
 * Commit interface representing a single point in Git history.
 */
export interface Commit {
  id: string; // Unique identifier (7-char random string)
  message: string; // User-provided commit message
  parents: string[]; // List of parent commit IDs
  timestamp: number; // Creation time in milliseconds
  author: string; // Author identifier
}

/**
 * GitState interface managing the entire simulation state.
 */
export interface GitState {
  commits: Commit[]; // History of all commits
  branches: Record<string, string>; // branchName -> latest commitId
  head: string; // Currently active branch name or commit hash
  stagingArea: string[]; // Files ready to be committed
  workingDirectory: Record<string, string>; // Local uncommitted file changes
  fileSystem: Record<string, Record<string, string>>; // Snapshots of files at each commitId
  remote: {
    commits: Commit[]; // Commits pushed to origin
    branches: Record<string, string>; // Remote branch heads
    pushedBranches: string[]; // Branches tracked by origin
  };
  openPrs: string[]; // Branches with an active Pull Request
}
