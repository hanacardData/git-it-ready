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

export type GitCommand =
  | { type: "commit"; message: string }
  | { type: "branch"; name: string; delete?: boolean }
  | { type: "checkout"; target: string; isNew?: boolean }
  | { type: "add"; files: string[] }
  | { type: "push" }
  | { type: "pull" }
  | { type: "merge"; source: string };
