/**
 * VisualGraph.tsx
 * Renders a visual representation of the Git history using SVG.
 * Calculates node positions based on branch lanes and commit depth.
 */
import React, { useMemo } from "react";
import type { GitState } from "../types/git";

interface VisualGraphProps {
  state: GitState; // Entire Git state to visualize
}

const VisualGraph: React.FC<VisualGraphProps> = ({ state }) => {
  const { commits, branches, head } = state;

  const positions = useMemo(() => {
    // Branch sorting layout rules (main occupies col 0)
    const branchNames = [
      "main",
      ...Object.keys(branches).filter((b) => b !== "main"),
    ];
    const commitPositions: Record<string, { x: number; y: number }> = {};
    const commitBranchMap: Record<string, string> = {};
    const commitDepth: Record<string, number> = {};

    // Assign branch lanes (X-axis) traversing in order
    branchNames.forEach((branch) => {
      let currentId: string | null = branches[branch];
      while (currentId) {
        if (!commitBranchMap[currentId]) {
          commitBranchMap[currentId] = branch;
        }
        const commit = commits.find((c) => c.id === currentId);
        currentId = commit?.parents[0] || null;
      }
    });

    // Calculate depth (Y-axis) based on tree structure
    commits.forEach((commit) => {
      if (commit.parents.length === 0) {
        commitDepth[commit.id] = 0; // Root commit
      } else if (commit.parents.length === 1) {
        // Standard commit: parent depth + 1
        const parentDepth = commitDepth[commit.parents[0]] ?? 0;
        commitDepth[commit.id] = parentDepth + 1;
      } else {
        // Merge commit: max(parents depth) + 1
        const depth1 = commitDepth[commit.parents[0]] ?? 0;
        const depth2 = commitDepth[commit.parents[1]] ?? 0;
        commitDepth[commit.id] = Math.max(depth1, depth2) + 1;
      }
    });

    // Map lanes (X) and depth (Y) to coordinates
    commits.forEach((commit) => {
      const branch = commitBranchMap[commit.id] || "main";
      const bIdx = branchNames.indexOf(branch);
      const depth = commitDepth[commit.id] ?? 0;

      commitPositions[commit.id] = {
        x: 160 + (bIdx !== -1 ? bIdx : 0) * 200, // Horizontal spacing
        y: 120 + depth * 90, // Vertical spacing based on depth
      };
    });

    return commitPositions;
  }, [commits, branches]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        backgroundColor: "#0d1117",
      }}
    >
      <svg width="100%" height={commits.length * 90 + 250}>
        {/* Legend Guide showing what colors represent */}
        <g transform="translate(20, 30)">
          <rect width="10" height="10" fill="#1f6feb" rx="2" />
          <text x="15" y="10" fill="#8b949e" fontSize="11">
            Local main
          </text>

          <rect x="90" width="10" height="10" fill="#238636" rx="2" />
          <text x="105" y="10" fill="#8b949e" fontSize="11">
            Local branch
          </text>

          <rect
            x="190"
            width="10"
            height="10"
            fill="#6e7681"
            rx="2"
            stroke="#c9d1d9"
            strokeDasharray="2,2"
          />
          <text x="205" y="10" fill="#8b949e" fontSize="11">
            Remote (origin)
          </text>
        </g>

        {/* Git edge rendering (lines between commits) */}
        {commits.map((commit) => {
          return commit.parents.map((parentId, pIdx) => {
            const start = positions[parentId];
            const end = positions[commit.id];
            if (!start || !end) return null;

            return (
              <line
                key={`edge-${commit.id}-${parentId}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={pIdx === 0 ? "#30363d" : "#586069"}
                strokeWidth={pIdx === 0 ? "2.5" : "1.8"}
                strokeDasharray={pIdx === 0 ? "" : "4,3"}
              />
            );
          });
        })}

        {/* Git node, text, and label rendering (circles and branch names) */}
        {commits.map((commit) => {
          const pos = positions[commit.id];
          if (!pos) return null;

          const isCurrentHead =
            branches[head] === commit.id || head === commit.id;

          const localBranchesAtCommit = Object.entries(branches).filter(
            ([, id]) => id === commit.id,
          );
          const remoteBranchesAtCommit = Object.entries(
            state.remote.branches,
          ).filter(([, id]) => id === commit.id);

          return (
            <g key={commit.id}>
              {/* Commit circle - green if it's the current HEAD */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="12"
                fill={isCurrentHead ? "#238636" : "#30363d"}
                stroke="#c9d1d9"
                strokeWidth="2"
              />
              {/* Commit hash and message snippet */}
              <text
                x={pos.x + 20}
                y={pos.y + 5}
                fill="#8b949e"
                fontSize="12"
                fontFamily="monospace"
              >
                {commit.id.substring(0, 7)} - {commit.message}
              </text>

              {/* Local branch badge display */}
              {localBranchesAtCommit.map(([name], idx) => (
                <g key={`local-label-${name}`}>
                  <rect
                    x={pos.x - 115}
                    y={pos.y - 10 - idx * 25}
                    width={95}
                    height={20}
                    rx={4}
                    fill={name === "main" ? "#1f6feb" : "#238636"}
                  />
                  <text
                    x={pos.x - 67.5}
                    y={pos.y + 4 - idx * 25}
                    fill="white"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {name.length > 7 ? `${name.substring(0, 5)}..` : name}
                    {head === name ? "★" : ""}
                  </text>
                </g>
              ))}

              {/* Remote branch badge display (dashed border) */}
              {remoteBranchesAtCommit.map(([name], idx) => (
                <g key={`remote-label-${name}`}>
                  <rect
                    x={pos.x - 45}
                    y={pos.y - 45 - idx * 25}
                    width={90}
                    height={20}
                    rx={4}
                    fill="#6e7681"
                    stroke="#c9d1d9"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 32 - idx * 25}
                    fill="white"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    origin/
                    {name.length > 5 ? `${name.substring(0, 4)}..` : name}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default VisualGraph;
