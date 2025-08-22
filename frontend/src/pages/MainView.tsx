// src/pages/MainView.tsx
import React, { useEffect, useState } from "react";
import Outliner from "../components/Outliner";
import GraphView from "../components/GraphView";
import ProjectSidebar from "../components/ProjectSidebar";
import { useOutlineStore } from "../store/outline";

export default function MainView() {
  const [tab, setTab] = useState<"outline" | "graph">("outline");
  const [collapsed, setCollapsed] = useState(false);

  // 最低1行を保証（現在プロジェクトの doc に対して）
  const { rootId, nodes, createChild, select } = useOutlineStore();
  useEffect(() => {
    if (!nodes || !rootId) return;
    const nonRootIds = Object.keys(nodes).filter((k) => k !== rootId);
    if (nonRootIds.length === 0 && nodes[rootId]) {
      const id = createChild(rootId, "");
      select(id);
    }
  }, [nodes, rootId, createChild, select]);

  return (
    <div className="flex h-screen bg-zinc-900 text-gray-200">
      <ProjectSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />

      <div className="flex h-full flex-1 flex-col">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
          <button
            onClick={() => setTab("outline")}
            className={`rounded-2xl px-3 py-1 text-sm ${
              tab === "outline"
                ? "bg-zinc-700 text-white"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            Outliner
          </button>
          <button
            onClick={() => setTab("graph")}
            className={`rounded-2xl px-3 py-1 text-sm ${
              tab === "graph"
                ? "bg-zinc-700 text-white"
                : "hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            Graph
          </button>
        </div>

        {/* Content */}
        <main className="flex-1">
          {tab === "outline" ? <Outliner /> : <GraphView />}
        </main>
      </div>
    </div>
  );
}
