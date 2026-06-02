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
    checkout,
    merge,
    push,
    openPullRequest,
    mergeRemote,
    updateWorkingDirectory,
    syncBranch,
  } = useGitSimulator();

  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Welcome to the Git Interactive Tutorial!",
    "---------------------------------------",
    "Follow the guide above to start your workflow.",
    "Try creating a branch first: git checkout -b feature-1",
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
    [state, add, commit, createBranch, checkout, merge, push, syncBranch],
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
          padding: "15px 20px",
          backgroundColor: "#161b22",
          borderBottom: "1px solid #30363d",
          color: "#e6edf3",
        }}
      >
        <div
          style={{
            marginBottom: "12px",
            fontWeight: "bold",
            color: "#58a6ff",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <svg width="20" height="20" fill="currentColor">
            <use
              xlinkHref={`${import.meta.env.BASE_URL}icons.svg#icon-github`}
            />
          </svg>
          Git Workflow Guide
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "13px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              1. Branching
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Create and switch to a new branch:
              <br />
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git checkout -b feature-name
              </code>
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              2. Staging
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Stage specific file or all changes:
              <br />
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git add README.md
              </code>{" "}
              or{" "}
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git add .
              </code>
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              3. Committing
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Save your staged changes:
              <br />
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git commit -m "message"
              </code>
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              4. Pushing
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Upload to remote repository:
              <br />
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git push origin branch-name
              </code>
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              5. PR & Merge
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Open PR in GitHub tab and merge into main.
            </div>
          </div>
          <div style={{ flex: "1", minWidth: "220px" }}>
            <strong style={{ color: "#79c0ff", fontSize: "14px" }}>
              6. Pulling
            </strong>
            <div
              style={{ marginTop: "6px", color: "#8b949e", lineHeight: "1.5" }}
            >
              Update local with remote changes:
              <br />
              <code
                style={{
                  fontSize: "13px",
                  backgroundColor: "#0d1117",
                  padding: "2px 4px",
                  borderRadius: "4px",
                }}
              >
                git pull origin main
              </code>
            </div>
          </div>
        </div>
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
