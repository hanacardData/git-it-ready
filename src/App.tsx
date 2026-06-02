import { useState, useCallback } from "react";
import "./styles/global.css";
import { useGitSimulator } from "./hooks/useGitSimulator";
import VisualGraph from "./components/VisualGraph";
import Terminal from "./components/Terminal";
import Editor from "./components/Editor";
import GitHubUI from "./components/GitHubUI";

function App() {
  const {
    state,
    add,
    commit,
    createBranch,
    deleteBranch,
    checkout,
    merge,
    push,
    openPullRequest,
    mergeRemote,
    updateWorkingDirectory,
    syncBranch,
  } = useGitSimulator();

  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Welcome to the Git Tutorial!",
    "Type commands to begin.",
  ]);
  const [activeTab, setActiveTab] = useState<"local" | "github">("local");

  const handleCommand = useCallback(
    (cmd: string) => {
      setTerminalOutput((prev) => [...prev, `$ ${cmd}`]);

      const parts = cmd.split(" ").filter((p) => p !== "");

      if (cmd.startsWith("git checkout -b ")) {
        const branchName = parts[3];
        createBranch(branchName);
        checkout(branchName);
        setTerminalOutput((prev) => [
          ...prev,
          `Created and switched to a new branch '${branchName}'`,
        ]);
      } else if (cmd.startsWith("git checkout ")) {
        const target = parts[2];
        if (
          state.branches[target] ||
          state.commits.find((c) => c.id === target)
        ) {
          checkout(target);
          setTerminalOutput((prev) => [...prev, `Switched to '${target}'`]);
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            `error: pathspec '${target}' did not match any file(s) known to git`,
          ]);
        }
      } else if (
        cmd.startsWith("git branch -d ") ||
        cmd.startsWith("git branch -D ")
      ) {
        const branchName = parts[3];
        if (state.head === branchName) {
          setTerminalOutput((prev) => [
            ...prev,
            `error: Cannot delete branch '${branchName}' checked out at '...'`,
          ]);
        } else if (state.branches[branchName]) {
          deleteBranch(branchName);
          setTerminalOutput((prev) => [
            ...prev,
            `Deleted branch ${branchName}`,
          ]);
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            `error: branch '${branchName}' not found.`,
          ]);
        }
      } else if (cmd.startsWith("git add ")) {
        const files = parts.slice(2);
        // Check if there are changes to add
        const currentCommitId = state.branches[state.head];
        const lastCommitFiles = state.fileSystem[currentCommitId] || {};

        const hasUnstagedChanges = Object.keys(state.workingDirectory).some(
          (f) => state.workingDirectory[f] !== lastCommitFiles[f],
        );

        if (!hasUnstagedChanges && state.stagingArea.length === 0) {
          setTerminalOutput((prev) => [...prev, `Nothing to add.`]);
        } else {
          add(files);
          const displayFiles = files.includes(".") ? "all" : files.join(", ");
          setTerminalOutput((prev) => [
            ...prev,
            `Staged ${displayFiles} files.`,
          ]);
        }
      } else if (cmd.startsWith("git commit -m ")) {
        if (state.stagingArea.length === 0) {
          setTerminalOutput((prev) => [
            ...prev,
            `nothing to commit, working tree clean`,
          ]);
        } else {
          const message = cmd.match(/"([^"]+)"/)?.[1] || "No message";
          commit(message);
          setTerminalOutput((prev) => [
            ...prev,
            `[${state.head}] commit: ${message}`,
          ]);
        }
      } else if (cmd.startsWith("git push origin ")) {
        const branchName = parts[3];
        const localCommitId = state.branches[branchName];
        const remoteCommitId = state.remote.branches[branchName];

        if (localCommitId === remoteCommitId) {
          setTerminalOutput((prev) => [...prev, `Everything up-to-date`]);
        } else {
          push(branchName);
          setTerminalOutput((prev) => [
            ...prev,
            `Pushed '${branchName}' to origin.`,
            `Next: You can now create a Pull Request in the [GitHub] tab.`,
          ]);
        }
      } else if (cmd === "git push") {
        const branchName = state.head;
        const remoteCommitId = state.remote.branches[branchName];

        if (!remoteCommitId) {
          setTerminalOutput((prev) => [
            ...prev,
            `fatal: The current branch ${branchName} has no upstream branch.`,
            `To push the current branch and set the remote as upstream, use:`,
            ``,
            `    git push origin ${branchName}`,
            ``,
          ]);
        } else {
          const localCommitId = state.branches[branchName];
          if (localCommitId === remoteCommitId) {
            setTerminalOutput((prev) => [...prev, `Everything up-to-date`]);
          } else {
            push(branchName);
            setTerminalOutput((prev) => [
              ...prev,
              `Pushed current branch '${branchName}' to origin.`,
              `Next: You can now create a Pull Request in the [GitHub] tab.`,
            ]);
          }
        }
      } else if (cmd === "git pull origin main") {
        const remoteMainId = state.remote.branches["main"];
        const localMainId = state.branches["main"];

        if (remoteMainId === localMainId) {
          setTerminalOutput((prev) => [...prev, `Already up to date.`]);
        } else if (remoteMainId) {
          syncBranch("main", remoteMainId);
          setTerminalOutput((prev) => [
            ...prev,
            `Updated local main with remote changes.`,
            `* pull: Fetches and merges remote changes into your local branch.`,
          ]);
        }
      } else if (cmd === "git pull") {
        const branchName = state.head;
        const remoteCommitId = state.remote.branches[branchName];
        const localCommitId = state.branches[branchName];

        if (!remoteCommitId) {
          setTerminalOutput((prev) => [
            ...prev,
            `fatal: No remote branch found for '${branchName}'.`,
            `If this is a new branch, you might want to pull from main first:`,
            ``,
            `    git pull origin main`,
            ``,
          ]);
        } else if (remoteCommitId === localCommitId) {
          setTerminalOutput((prev) => [...prev, `Already up to date.`]);
        } else {
          syncBranch(branchName, remoteCommitId);
          setTerminalOutput((prev) => [
            ...prev,
            `Updated local '${branchName}' with remote changes from origin.`,
          ]);
        }
      } else if (cmd.startsWith("git merge ")) {
        const source = parts[2];
        if (state.branches[source]) {
          merge(source);
          setTerminalOutput((prev) => [
            ...prev,
            `Merged branch '${source}' into '${state.head}'`,
          ]);
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            `error: '${source}' - not something we can merge`,
          ]);
        }
      } else if (cmd === "git status") {
        setTerminalOutput((prev) => [
          ...prev,
          `On branch ${state.head}`,
          state.stagingArea.length > 0
            ? `Changes to be committed: ${state.stagingArea.join(", ")}`
            : "nothing to commit, working tree clean",
        ]);
      } else if (cmd === "clear") {
        setTerminalOutput([]);
      } else {
        setTerminalOutput((prev) => [...prev, `Unknown command: ${cmd}`]);
      }
    },
    [
      state,
      add,
      commit,
      createBranch,
      deleteBranch,
      checkout,
      merge,
      push,
      syncBranch,
    ],
  );

  return (
    <div className="app-container">
      <header className="header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "20px" }}>
            Git & GitHub Interactive Tutorial
          </h1>
          <nav style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setActiveTab("local")}
              style={{
                backgroundColor:
                  activeTab === "local" ? "#1f6feb" : "transparent",
                color: "white",
                border: "1px solid #30363d",
                padding: "5px 15px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Local (Editor/Terminal)
            </button>
            <button
              onClick={() => setActiveTab("github")}
              style={{
                backgroundColor:
                  activeTab === "github" ? "#1f6feb" : "transparent",
                color: "white",
                border: "1px solid #30363d",
                padding: "5px 15px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              GitHub (PR/Merge)
            </button>
          </nav>
        </div>
      </header>

      <div
        style={{
          padding: "10px 20px",
          backgroundColor: "#161b22",
          borderBottom: "1px solid #30363d",
          color: "#e6edf3",
          fontSize: "14px",
        }}
      >
        <strong>Tip:</strong> Feel free to practice Git commands! Try creating a
        branch (<code>git checkout -b</code>), editing files, committing (
        <code>git add</code>, <code>git commit</code>), and pushing to see the
        graph change.
      </div>

      <main className="main-content">
        <section className="left-panel">
          {activeTab === "local" ? (
            <>
              <div className="editor-container">
                <Editor
                  fileName="README.md"
                  content={state.workingDirectory["README.md"]}
                  onChange={(content) =>
                    updateWorkingDirectory("README.md", content)
                  }
                />
              </div>
              <div className="terminal-container">
                <Terminal onCommand={handleCommand} output={terminalOutput} />
              </div>
            </>
          ) : (
            <GitHubUI
              state={state}
              onPrCreate={(branchName) => openPullRequest(branchName)}
              onMerge={(branchName) => {
                mergeRemote(branchName, "main");
                setTerminalOutput((prev) => [
                  ...prev,
                  `Merged ${branchName} into main on Remote repository.`,
                ]);
              }}
            />
          )}
        </section>
        <section className="right-panel">
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid #30363d",
              fontWeight: "bold",
            }}
          >
            Git History Visualization
          </div>
          <VisualGraph state={state} />
        </section>
      </main>
    </div>
  );
}

export default App;
