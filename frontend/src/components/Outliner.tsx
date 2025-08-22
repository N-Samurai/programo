// src/components/Outliner.tsx
import React from "react";
import { useOutlineStore } from "../store/outline";
import OutlineRow from "./OutlineRow";
import { deriveAutoEdges } from "../lib/links";

export default function Outliner() {
  const { rootId, nodes } = useOutlineStore();

  const renderTree = (id: string, depth: number): React.ReactNode => {
    const n = nodes[id];
    return (
      <div key={id}>
        {id !== rootId && <OutlineRow id={id} depth={depth} />}
        {n.children.map((cid: string) =>
          renderTree(cid, depth + (id === rootId ? 0 : 1))
        )}
      </div>
    );
  };

  // （おまけ）右上に導出リンクの件数だけ表示
  const edges = deriveAutoEdges(nodes);

  return (
    <div className="h-full w-full overflow-auto bg-zinc-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Outliner</h2>
        <div className="text-xs text-zinc-400">
          auto-links: <span className="text-emerald-300">{edges.length}</span>
        </div>
      </div>
      {renderTree(rootId, 0)}
    </div>
  );
}
