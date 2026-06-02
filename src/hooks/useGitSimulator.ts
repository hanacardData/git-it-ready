import { useState, useCallback } from "react";
import type { Commit, GitState } from "../types/git";

const INITIAL_COMMIT_ID = "root-commit";
const INITIAL_CONTENT = "# Git-it-ready";

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

// Helper to merge file contents line by line
const combineFileContents = (
  currentContent: string,
  incomingContent: string,
): string => {
  if (!currentContent) return incomingContent;
  if (!incomingContent || currentContent === incomingContent)
    return currentContent;

  const currentLines = currentContent.split("\n");
  const incomingLines = incomingContent.split("\n");

  // Accumulate unique lines from incoming content
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

  // git checkout -b [name]
  const createBranch = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      branches: {
        ...prev.branches,
        [name]: prev.branches[prev.head] || prev.head,
      },
    }));
  }, []);

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

  // git add
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

  // git commit
  const commit = useCallback((message: string) => {
    setState((prev) => {
      const currentCommitId = prev.branches[prev.head] || prev.head;
      const newCommitId = Math.random().toString(36).substring(2, 9);

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

  // git push
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

  // git merge [source] - Merge with cumulative line-based content
  const merge = useCallback((source: string) => {
    setState((prev) => {
      const targetBranch = prev.head;
      const sourceCommitId = prev.branches[source];
      const targetCommitId = prev.branches[targetBranch];

      if (!sourceCommitId || !targetCommitId || source === targetBranch)
        return prev;

      const newCommitId = Math.random().toString(36).substring(2, 9);

      // Current workspace state
      const currentFiles = { ...prev.workingDirectory };
      const sourceFiles = prev.fileSystem[sourceCommitId] || {};

      const allFileNames = [
        ...new Set([...Object.keys(currentFiles), ...Object.keys(sourceFiles)]),
      ];

      const mergedFiles: Record<string, string> = {};

      allFileNames.forEach((fileName) => {
        const currentContent = currentFiles[fileName] || "";
        const incomingContent = sourceFiles[fileName] || "";

        // Combine file contents cumulatively
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

  // GitHub PR
  const openPullRequest = useCallback((branchName: string) => {
    setState((prev) => ({
      ...prev,
      openPrs: [...new Set([...prev.openPrs, branchName])],
    }));
  }, []);

  // GitHub remote merge - Cumulative content merging
  const mergeRemote = useCallback((source: string, target: string) => {
    setState((prev) => {
      const sourceCommitId = prev.remote.branches[source];
      const targetCommitId = prev.remote.branches[target];
      if (!sourceCommitId || !targetCommitId) return prev;

      const newCommitId = Math.random().toString(36).substring(2, 9);

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

        // 💡 Combine file contents for remote merge
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

  // Handle file editing
  const updateWorkingDirectory = useCallback(
    (fileName: string, content: string) => {
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

  // Sync branch with remote commit
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
