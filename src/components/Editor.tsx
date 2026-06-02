import React from "react";

interface EditorProps {
  fileName: string;
  content: string;
  onChange: (content: string) => void;
}

const Editor: React.FC<EditorProps> = ({ fileName, content, onChange }) => {
  return (
    <div
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          backgroundColor: "#21262d",
          padding: "8px 16px",
          borderTopLeftRadius: "6px",
          borderTopRightRadius: "6px",
          border: "1px solid #30363d",
          borderBottom: "none",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        File Editor: {fileName}
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          backgroundColor: "#0d1117",
          color: "#c9d1d9",
          border: "1px solid #30363d",
          padding: "16px",
          fontFamily: "monospace",
          fontSize: "16px",
          outline: "none",
          resize: "none",
          borderBottomLeftRadius: "6px",
          borderBottomRightRadius: "6px",
        }}
      />
    </div>
  );
};

export default Editor;
