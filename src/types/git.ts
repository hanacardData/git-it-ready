export interface Commit {
  id: string;
  message: string;
  parents: string[];
  timestamp: number;
  author: string;
}

export interface GitState {
  commits: Commit[];
  branches: Record<string, string>; // branchName -> commitId
  head: string; // branchName or commitId
  stagingArea: string[]; // file names staged
  workingDirectory: Record<string, string>; // fileName -> content
  fileSystem: Record<string, Record<string, string>>; // commitId -> { fileName -> content }
  remote: {
    commits: Commit[];
    branches: Record<string, string>;
    pushedBranches: string[];
  };
  openPrs: string[]; // List of branch names with open PRs
}
