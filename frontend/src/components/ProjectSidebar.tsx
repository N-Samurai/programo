// src/components/ProjectSidebar.tsx
import React, { useState } from "react";
import { useOutlineStore } from "../store/outline";

export default function ProjectSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const {
    projects,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
  } = useOutlineStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const entries = Object.values(projects);

  return (
    <aside
      className={`h-full border-r border-zinc-800 bg-zinc-900/80 transition-all duration-200 ${
        collapsed ? "w-12" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-2 py-2">
        {!collapsed && (
          <div className="px-2 text-sm font-medium text-zinc-300">Projects</div>
        )}
        <button
          className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          onClick={onToggle}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-2">
          <button
            className="mb-2 w-full rounded bg-zinc-800 px-2 py-1 text-left text-sm text-zinc-200 hover:bg-zinc-700"
            onClick={() => createProject()}
          >
            + New project
          </button>

          <ul className="space-y-1">
            {entries.map((p) => {
              const active = p.id === currentProjectId;
              return (
                <li
                  key={p.id}
                  className={`group flex items-center justify-between rounded px-2 py-1 ${
                    active ? "bg-zinc-800" : "hover:bg-zinc-800/70"
                  }`}
                >
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      className="mr-2 w-full rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-100 outline-none"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameProject(p.id, tempName.trim() || p.name);
                          setEditingId(null);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => setEditingId(null)}
                    />
                  ) : (
                    <button
                      className="truncate text-left text-sm text-zinc-200"
                      onClick={() => switchProject(p.id)}
                      title={p.name}
                    >
                      {p.name}
                    </button>
                  )}

                  <div className="ml-2 hidden gap-1 group-hover:flex">
                    <button
                      className="rounded px-1 text-xs text-zinc-300 hover:bg-zinc-700"
                      onClick={() => {
                        setEditingId(p.id);
                        setTempName(p.name);
                      }}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      className="rounded px-1 text-xs text-red-300 hover:bg-red-900/40"
                      onClick={() => deleteProject(p.id)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
