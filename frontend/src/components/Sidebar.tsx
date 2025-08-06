import React, { useState } from "react";
import { Tree } from "@minoru/react-dnd-treeview";
import type { AppNode, NodeData, Kind } from "../types/tree";

type Props = {
  tree: AppNode[];
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  onCreate: (kind: Kind) => void;
  onRename: (id: string | number, name: string) => void;
  onDrop: (newTree: AppNode[]) => void;
  canDrop: (tree: AppNode[], opts: any) => boolean;
};

const ROOT = 0;

export default function Sidebar({
  tree,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDrop,
  canDrop,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | number | null>(null);
  const [renameText, setRenameText] = useState("");

  const commitRename = (id: string | number) => {
    const t = renameText.trim();
    setRenamingId(null);
    if (t) onRename(id, t);
  };

  const renderNode = (
    node: AppNode,
    {
      depth,
      isOpen,
      onToggle,
    }: { depth: number; isOpen: boolean; onToggle: () => void }
  ) => (
    <div
      className="flex items-center px-1 py-0.5 rounded select-none"
      style={{ marginInlineStart: depth * 12 }}
    >
      {node.droppable && (
        <button
          className="w-5 text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? "▾" : "▸"}
        </button>
      )}

      <span className="mr-1">{node.droppable ? "📁" : "📄"}</span>

      {renamingId === node.id ? (
        <input
          className="flex-1 bg-zinc-800 text-gray-200 rounded px-1"
          autoFocus
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onBlur={() => commitRename(node.id)}
          onKeyDown={(e) => e.key === "Enter" && commitRename(node.id)}
        />
      ) : (
        <span
          className={`flex-1 truncate cursor-pointer ${
            selectedId === node.id ? "text-blue-400" : "hover:text-blue-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenamingId(node.id);
            setRenameText(String(node.text ?? ""));
          }}
          title={String(node.text ?? "")}
        >
          {node.text}
        </span>
      )}
    </div>
  );

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-700 p-3 text-sm">
      <div className="flex gap-2 mb-3">
        <button
          className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600"
          onClick={() => onCreate("folder")}
        >
          +Folder
        </button>
        <button
          className="px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600"
          onClick={() => onCreate("file")}
        >
          +File
        </button>
      </div>

      <Tree<NodeData>
        tree={tree}
        rootId={ROOT}
        render={renderNode}
        onDrop={onDrop} // ← newTree をそのまま set するだけ
        canDrop={canDrop} // ← フォルダ/ルートのみ
        classes={{
          root: "h-[calc(100vh-150px)] overflow-auto text-gray-200",
          dropTarget: "bg-zinc-700/40",
        }}
      />
    </aside>
  );
}
