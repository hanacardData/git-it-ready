/**
 * useGitSimulator.ts
 * Core logic for the Git simulation.
 * Manages repository state, staging area, commits, branching, and remote synchronization.
 */
import { useState, useCallback } from "react";
import type { Commit, GitState } from "../types/git";

const INITIAL_CONTENT = "# Git-it-ready";

/**
 * List of forbidden names to prevent Prototype Pollution or internal object corruption.
 */
const FORBIDDEN_NAMES = [
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
];

/**
 * Validates if a name (branch or file) is safe to use as an object key.
 */
const isValidName = (name: string): boolean => {
  return !!name && !FORBIDDEN_NAMES.includes(name);
};

/**
 * Helper to generate a unique 7-character commit ID.
 * Ensures no collisions within the current history.
 */
const generateUniqueId = (commits: Commit[]): string => {
  const existingIds = new Set(commits.map((c) => c.id));
  let newId: string;
  do {
    newId = Math.random().toString(36).substring(2, 9);
  } while (existingIds.has(newId));
  return newId;
};

// Initial state for a fresh repository with one "Initial commit"
const INITIAL_COMMIT_ID = Math.random().toString(36).substring(2, 9);
const initialState: GitState = {
  commits: [
    {
      id: INITIAL_COMMIT_ID,
      message: "Initial commit",
      parents: [],
      timestamp: Date.now(),
      author: "user",
    },
  ],
  branches: {
    main: INITIAL_COMMIT_ID,
  },
  head: "main",
  stagingArea: [],
  workingDirectory: {
    "README.md": INITIAL_CONTENT,
  },
  fileSystem: {
    [INITIAL_COMMIT_ID]: {
      "README.md": INITIAL_CONTENT,
    },
  },
  remote: {
    commits: [
      {
        id: INITIAL_COMMIT_ID,
        message: "Initial commit",
        parents: [],
        timestamp: Date.now(),
        author: "user",
      },
    ],
    branches: {
      main: INITIAL_COMMIT_ID,
    },
    pushedBranches: ["main"],
  },
  openPrs: [],
};

/**
 * Helper to merge file contents line by line.
 * Mimics a simple Git merge strategy by accumulating unique lines.
 */
const combineFileContents = (
  currentContent: string,
  incomingContent: string,
): string => {
  if (!currentContent) return incomingContent;
  if (!incomingContent || currentContent === incomingContent)
    return currentContent;

  const currentLines = currentContent.split("\n");
  const incomingLines = incomingContent.split("\n");

  const mergedLines = [...currentLines];
  incomingLines.forEach((line) => {
    if (!mergedLines.includes(line)) {
      mergedLines.push(line);
    }
  });

  return mergedLines.join("\n");
};

export const useGitSimulator = () => {
  const [state, setState] = useState<GitState>(initialState);

  /**
   * git branch [name]
   * Creates a new branch pointing to the current HEAD.
   * Includes validation to prevent unsafe names.
   */
  const createBranch = useCallback((name: string) => {
    if (!isValidName(name)) return;
    setState((prev) => ({
      ...prev,
      branches: {
        ...prev.branches,
        [name]: prev.branches[prev.head] || prev.head,
      },
    }));
  }, []);

  /**
   * git checkout [target]
   * Switches HEAD to a branch or commit ID and updates the working directory.
   */
  const checkout = useCallback((target: string) => {
    setState((prev) => {
      const targetCommitId = prev.branches[target] || target;
      const targetFiles =
        prev.fileSystem[targetCommitId] ||
        prev.fileSystem[INITIAL_COMMIT_ID] ||
        {};

      return {
        ...prev,
        head: target,
        workingDirectory: { ...targetFiles },
        stagingArea: [],
      };
    });
  }, []);

  /**
   * git add [files]
   * Moves changes from the working directory to the staging area.
   */
  const add = useCallback((files: string[]) => {
    setState((prev) => {
      let filesToStage = [...files];
      if (files.includes(".")) {
        filesToStage = Object.keys(prev.workingDirectory);
      }
      return {
        ...prev,
        stagingArea: [...new Set([...prev.stagingArea, ...filesToStage])],
      };
    });
  }, []);

  /**
   * git commit -m [message]
   * Creates a new commit with the current staged changes.
   */
  const commit = useCallback((message: string) => {
    setState((prev) => {
      const currentCommitId = prev.branches[prev.head] || prev.head;
      const newCommitId = generateUniqueId(prev.commits);

      const newCommit: Commit = {
        id: newCommitId,
        message,
        parents: [currentCommitId],
        timestamp: Date.now(),
        author: "user",
      };

      const newBranches = { ...prev.branches };
      let newHead = prev.head;

      if (prev.branches[prev.head] !== undefined) {
        newBranches[prev.head] = newCommit.id;
      } else {
        newHead = newCommit.id;
      }

      return {
        ...prev,
        commits: [...prev.commits, newCommit],
        branches: newBranches,
        head: newHead,
        stagingArea: [],
        fileSystem: {
          ...prev.fileSystem,
          [newCommitId]: { ...prev.workingDirectory },
        },
      };
    });
  }, []);

  /**
   * git push
   * Syncs local commits and branch head to the remote repository.
   */
  const push = useCallback((branchName: string) => {
    setState((prev) => {
      const branchToPush = branchName || prev.head;
      const commitId = prev.branches[branchToPush];

      if (!commitId) return prev;

      return {
        ...prev,
        remote: {
          ...prev.remote,
          commits: [
            ...prev.remote.commits,
            ...prev.commits.filter(
              (c) => !prev.remote.commits.find((rc) => rc.id === c.id),
            ),
          ],
          branches: {
            ...prev.remote.branches,
            [branchToPush]: commitId,
          },
          pushedBranches: [
            ...new Set([...prev.remote.pushedBranches, branchToPush]),
          ],
        },
      };
    });
  }, []);

  /**
   * git merge [source]
   * Merges changes from the source branch into the current HEAD using a cumulative line-based strategy.
   */
  const merge = useCallback((source: string) => {
    setState((prev) => {
      const targetBranch = prev.head;
      const sourceCommitId = prev.branches[source];
      const targetCommitId = prev.branches[targetBranch];

      if (!sourceCommitId || !targetCommitId || source === targetBranch)
        return prev;

      const newCommitId = generateUniqueId(prev.commits);

      const currentFiles = { ...prev.workingDirectory };
      const sourceFiles = prev.fileSystem[sourceCommitId] || {};

      const allFileNames = [
        ...new Set([...Object.keys(currentFiles), ...Object.keys(sourceFiles)]),
      ];

      const mergedFiles: Record<string, string> = {};

      allFileNames.forEach((fileName) => {
        const currentContent = currentFiles[fileName] || "";
        const incomingContent = sourceFiles[fileName] || "";

        mergedFiles[fileName] = combineFileContents(
          currentContent,
          incomingContent,
        );
      });

      const newCommit: Commit = {
        id: newCommitId,
        message: `Merge branch '${source}' into ${targetBranch}`,
        parents: [targetCommitId, sourceCommitId],
        timestamp: Date.now(),
        author: "user",
      };

      return {
        ...prev,
        commits: [...prev.commits, newCommit],
        branches: {
          ...prev.branches,
          [targetBranch]: newCommitId,
        },
        fileSystem: {
          ...prev.fileSystem,
          [newCommitId]: mergedFiles,
        },
        workingDirectory: { ...mergedFiles },
      };
    });
  }, []);

  /**
   * GitHub: Compare & pull request
   * Marks a branch as having an open Pull Request on the remote.
   */
  const openPullRequest = useCallback((branchName: string) => {
    setState((prev) => ({
      ...prev,
      openPrs: [...new Set([...prev.openPrs, branchName])],
    }));
  }, []);

  /**
   * GitHub: Merge Pull Request
   * Merges the PR branch into main on the remote repository.
   */
  const mergeRemote = useCallback((source: string, target: string) => {
    setState((prev) => {
      const sourceCommitId = prev.remote.branches[source];
      const targetCommitId = prev.remote.branches[target];
      if (!sourceCommitId || !targetCommitId) return prev;

      const newCommitId = generateUniqueId(prev.commits);

      const currentRemoteFiles = prev.fileSystem[targetCommitId] || {};
      const sourceFiles = prev.fileSystem[sourceCommitId] || {};

      const allFileNames = [
        ...new Set([
          ...Object.keys(currentRemoteFiles),
          ...Object.keys(sourceFiles),
        ]),
      ];

      const mergedFiles: Record<string, string> = {};

      allFileNames.forEach((fileName) => {
        const currentContent = currentRemoteFiles[fileName] || "";
        const incomingContent = sourceFiles[fileName] || "";

        mergedFiles[fileName] = combineFileContents(
          currentContent,
          incomingContent,
        );
      });

      const newCommit: Commit = {
        id: newCommitId,
        message: `GitHub Merge: '${source}' into ${target}`,
        parents: [targetCommitId, sourceCommitId],
        timestamp: Date.now(),
        author: "github-system",
      };

      return {
        ...prev,
        commits: [...prev.commits, newCommit],
        fileSystem: {
          ...prev.fileSystem,
          [newCommitId]: mergedFiles,
        },
        remote: {
          ...prev.remote,
          commits: [...prev.remote.commits, newCommit],
          branches: {
            ...prev.remote.branches,
            [target]: newCommitId,
          },
          pushedBranches: prev.remote.pushedBranches.filter(
            (b) => b !== source,
          ),
        },
        openPrs: prev.openPrs.filter((b) => b !== source),
      };
    });
  }, []);

  /**
   * Local file editing
   * Updates the content of a file in the simulated working directory.
   * Includes validation to prevent unsafe file names.
   */
  const updateWorkingDirectory = useCallback(
    (fileName: string, content: string) => {
      if (!isValidName(fileName)) return;
      setState((prev) => ({
        ...prev,
        workingDirectory: {
          ...prev.workingDirectory,
          [fileName]: content,
        },
      }));
    },
    [],
  );

  /**
   * git pull
   * Updates the local branch head and working directory with remote changes.
   */
  const syncBranch = useCallback((branchName: string, commitId: string) => {
    setState((prev) => {
      const files = prev.fileSystem[commitId];
      if (!files) return prev;

      return {
        ...prev,
        branches: {
          ...prev.branches,
          [branchName]: commitId,
        },
        head: branchName,
        workingDirectory: { ...files },
        stagingArea: [],
      };
    });
  }, []);

  return {
    state,
    add,
    commit,
    createBranch,
    checkout,
    merge,
    push,
    openPullRequest,
    mergeRemote,
    updateWorkingDirectory,
    syncBranch,
  };
};
