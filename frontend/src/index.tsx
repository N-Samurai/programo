// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // ← Tailwind CSS を読み込む
import MainView from "./pages/MainView"; // ← ファイル名に合わせて修正

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(<MainView />);
