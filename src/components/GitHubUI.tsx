/**
 * GitHubUI.tsx
 * A simulated GitHub web interface for managing Pull Requests and merging on origin.
 */
import React from "react";
import type { GitState } from "../types/git";

interface GitHubUIProps {
  state: GitState; // Current simulated Git state
  onPrCreate: (branchName: string) => void; // Triggered when "Compare & pull request" is clicked
  onMerge: (branchName: string) => void; // Triggered when "Merge Pull Request" is clicked
}

const GitHubUI: React.FC<GitHubUIProps> = ({ state, onPrCreate, onMerge }) => {
  const { remote, openPrs } = state;

  // Filter branches that have been pushed to origin but don't have an open PR yet
  const pushBranchesWithoutPr = remote.pushedBranches.filter(
    (b) => b !== "main" && !openPrs.includes(b),
  );

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#0d1117",
        color: "#c9d1d9",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* "Compare & pull request" banner section for recently pushed branches */}
      {pushBranchesWithoutPr.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <h3
            style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px" }}
          >
            Recent Pushes
          </h3>
          {pushBranchesWithoutPr.map((branch) => (
            <div
              key={branch}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#161b22",
                padding: "10px 15px",
                borderRadius: "6px",
                border: "1px solid #30363d",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontWeight: "bold" }}>{branch}</span>
              <button
                onClick={() => onPrCreate(branch)}
                style={{
                  backgroundColor: "#238636",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Compare & pull request
              </button>
            </div>
          ))}
        </div>
      )}

      {/* List of open Pull Requests */}
      <h3 style={{ borderBottom: "1px solid #30363d", paddingBottom: "10px" }}>
        Pull Requests
      </h3>

      {openPrs.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#8b949e" }}>
          <p>There are no open pull requests.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {openPrs.map((branch) => {
            // Check if the PR branch has already been merged into remote main
            const isMerged =
              remote.branches["main"] === remote.branches[branch];

            return (
              <div
                key={branch}
                style={{
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  padding: "20px",
                  backgroundColor: "#161b22",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>Update from {branch}</h4>
                  <span
                    style={{
                      backgroundColor: isMerged ? "#8250df" : "#238636",
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {isMerged ? "Merged" : "Open"}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#8b949e",
                    margin: "0 0 20px 0",
                  }}
                >
                  user wants to merge commits from <strong>{branch}</strong>{" "}
                  into <strong>main</strong>.
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => onMerge(branch)}
                    disabled={isMerged}
                    style={{
                      backgroundColor: isMerged ? "#30363d" : "#238636",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: isMerged ? "default" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {isMerged ? "Merged" : "Merge Pull Request"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GitHubUI;
