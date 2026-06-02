/**
 * Terminal.tsx
 * A simulated terminal component for entering Git commands and viewing output.
 */
import React, { useState, useRef, useEffect } from "react";

interface TerminalProps {
  onCommand: (command: string) => void; // Callback to handle executed commands
  output: string[]; // List of lines to display in the terminal
}

const Terminal: React.FC<TerminalProps> = ({ onCommand, output }) => {
  const [input, setInput] = useState(""); // Current input field value
  const [history, setHistory] = useState<string[]>([]); // Command history for arrow key navigation
  const [historyIndex, setHistoryIndex] = useState(-1); // Current position in history
  const inputRef = useRef<HTMLInputElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new output arrives
  const scrollToBottom = () => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [output]);

  // Handle command submission
  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input.trim());
      setHistory((prev) => [...prev, input.trim()]);
      setInput("");
      setHistoryIndex(-1);
    }
  };

  // Handle arrow key navigation through history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < history.length) {
          const cmd = history[history.length - 1 - nextIndex];
          setInput(cmd);
          setHistoryIndex(nextIndex);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        const cmd = history[history.length - 1 - nextIndex];
        setInput(cmd);
        setHistoryIndex(nextIndex);
      } else if (historyIndex === 0) {
        setInput("");
        setHistoryIndex(-1);
      }
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      onClick={handleContainerClick}
      style={{
        backgroundColor: "#000",
        color: "#00ff00",
        height: "100%",
        fontFamily: "monospace",
        fontSize: "16px",
        display: "flex",
        flexDirection: "column",
        padding: "10px",
        cursor: "text",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div ref={outputEndRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex" }}>
        <span style={{ marginRight: "8px" }}>$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#00ff00",
            fontFamily: "monospace",
            fontSize: "16px",
            outline: "none",
            flex: 1,
          }}
          autoFocus
        />
      </form>
    </div>
  );
};

export default Terminal;
