// src/components/Outliner.tsx
import React, { useMemo } from "react";
import { useOutlineStore } from "../store/outline";
import OutlineRow from "./OutlineRow";
import { deriveAutoEdges } from "../lib/links";

export default function Outliner() {
  // セレクタを分けて購読（無駄な再レンダーやループを避ける）
  const rootId = useOutlineStore((s) => s.rootId);
  const nodes = useOutlineStore((s) => s.nodes);

  // 循環（親子が誤ってループ）しても落ちないようガード
  const renderTree = (
    id: string,
    depth: number,
    visited = new Set<string>()
  ): React.ReactNode => {
    if (visited.has(id)) return null; // 循環防止
    visited.add(id);

    const n = nodes[id];
    if (!n) return null;

    const nextDepth = depth + (id === rootId ? 0 : 1);

    return (
      <div key={id}>
        {id !== rootId && <OutlineRow id={id} depth={depth} />}
        {n.children.map((cid: string) =>
          renderTree(cid, nextDepth, new Set(visited))
        )}
      </div>
    );
  };

  // 導出リンクは nodes が変わった時だけ再計算
  const edges = useMemo(() => deriveAutoEdges(nodes), [nodes]);

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
