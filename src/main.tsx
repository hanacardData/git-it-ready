/**
 * main.tsx
 * Entry point for the React application.
 * Initializes the root element and renders the App component within StrictMode.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
