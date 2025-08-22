// src/components/GraphView.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { useOutlineStore } from "../store/outline";
import { deriveAutoEdges } from "../lib/links";

type Id = string;

export default function GraphView() {
  const { rootId, nodes, selectedId, select } = useOutlineStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  // 表示トグル
  const [showSibling, setShowSibling] = useState(true);
  const [showFirst, setShowFirst] = useState(true);
  const [showManual, setShowManual] = useState(true);
  const [showAuto, setShowAuto] = useState(false); // 既定ではOFF

  // 親参照を作る（簡易インデックス）
  const parentOf = useMemo<Record<Id, Id | null>>(() => {
    const map: Record<Id, Id | null> = {};
    Object.keys(nodes).forEach((pid) => {
      const p = nodes[pid];
      if (!p) return;
      p.children.forEach((cid: string) => (map[cid] = pid));
      if (!(pid in map)) map[pid] = null;
    });
    return map;
  }, [nodes]);

  const isAncestor = (a: Id, b: Id) => {
    let cur: Id | null | undefined = parentOf[b];
    while (cur) {
      if (cur === a) return true;
      cur = parentOf[cur];
    }
    return false;
  };

  // Outliner → Graph 変換
  const elements = useMemo<ElementDefinition[]>(() => {
    const els: ElementDefinition[] = [];

    // ルートは表示しない（Outliner は root の子から描画しているため:contentReference[oaicite:0]{index=0}）
    Object.keys(nodes).forEach((id) => {
      if (id === rootId) return;
      const n = nodes[id];
      if (!n) return;
      els.push({ data: { id, label: n.name || id }, classes: "n" });
    });

    // 兄弟エッジ（順番にのみ接続）
    if (showSibling) {
      Object.keys(nodes).forEach((pid) => {
        const p = nodes[pid];
        if (!p) return;
        const arr = p.children;
        for (let i = 0; i < arr.length - 1; i++) {
          const a = arr[i],
            b = arr[i + 1];
          if (!nodes[a] || !nodes[b]) continue;
          if (a === rootId || b === rootId) continue;
          els.push({
            data: { id: `sib-${a}-${b}`, source: a, target: b, kind: "sib" },
            classes: "e sib",
          });
        }
      });
    }

    // 親 → 最初の子（root は除外）
    if (showFirst) {
      Object.keys(nodes).forEach((pid) => {
        if (pid === rootId) return;
        const p = nodes[pid];
        if (!p) return;
        const first = p.children[0];
        if (!first) return;
        if (!nodes[first] || first === rootId) return;
        els.push({
          data: {
            id: `first-${pid}-${first}`,
            source: pid,
            target: first,
            kind: "first",
          },
          classes: "e first",
        });
      });
    }

    // 手動リンク（[[...]]）
    if (showManual) {
      Object.keys(nodes).forEach((id) => {
        if (id === rootId) return;
        const n = nodes[id];
        if (!n) return;
        (n.manualLinks ?? []).forEach((to: string) => {
          if (!nodes[to] || to === rootId) return;
          els.push({
            data: {
              id: `manual-${id}-${to}`,
              source: id,
              target: to,
              kind: "manual",
            },
            classes: "e manual",
          });
        });
      });
    }

    // 自動リンク（祖先-子孫は除外、兄弟には任意）
    if (showAuto) {
      const auto = deriveAutoEdges(nodes);
      auto.forEach((e: { from: Id; to: Id; reason?: string }, i: number) => {
        const { from, to } = e;
        if (!nodes[from] || !nodes[to]) return;
        if (from === rootId || to === rootId) return;
        if (isAncestor(from, to) || isAncestor(to, from)) return;
        els.push({
          data: {
            id: `auto-${i}-${from}-${to}`,
            source: from,
            target: to,
            kind: "auto",
            reason: e.reason ?? "",
          },
          classes: "e auto",
        });
      });
    }

    return els;
  }, [nodes, rootId, showSibling, showFirst, showManual, showAuto, parentOf]);

  // 初期化
  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node.n",
          style: {
            "background-color": "#4b6bfb",
            "border-width": 0,
            label: "data(label)",
            color: "#e5e7eb",
            "font-size": 12,
            "text-outline-width": 1,
            "text-outline-color": "rgba(2,6,23,0.9)",
            "text-valign": "center",
            "text-halign": "center",
            shape: "round-rectangle",
            padding: "6px 10px",
          },
        },
        {
          selector: "node.n:selected",
          style: { "background-color": "#f59e0b" },
        },

        {
          selector: "edge.e",
          style: {
            width: 1.8,
            "curve-style": "bezier",
            "line-color": "rgba(148,163,184,0.5)",
            "target-arrow-shape": "none",
          },
        },
        {
          selector: "edge.sib",
          style: { "line-color": "rgba(148,163,184,0.65)" },
        },
        {
          selector: "edge.first",
          style: { "line-color": "rgba(203,213,225,0.75)", width: 2 },
        },
        {
          selector: "edge.manual",
          style: { "line-color": "rgba(245,158,11,0.85)", width: 2 },
        },
        {
          selector: "edge.auto",
          style: {
            "line-color": "rgba(34,197,94,0.6)",
            "line-style": "dashed",
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        padding: 20,
        nodeRepulsion: () => 12000,
        idealEdgeLength: () => 120,
        gravity: 1,
      },
    });

    cy.on("select", "node", (evt) => select(evt.target.id()));

    const obs = new ResizeObserver(() => cy.resize());
    obs.observe(containerRef.current);

    cyRef.current = cy;
    return () => {
      obs.disconnect();
      cy.destroy();
    };
  }, [elements, select]);

  // Store選択 → Graph反映
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedId && cy.getElementById(selectedId).length > 0) {
      const el = cy.getElementById(selectedId);
      el.select();
      cy.center(el);
    }
  }, [selectedId]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-3 z-10 flex gap-2 rounded-md bg-black/30 px-2 py-1 text-xs text-zinc-300 backdrop-blur">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showSibling}
            onChange={(e) => setShowSibling(e.target.checked)}
          />{" "}
          Sibling
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showFirst}
            onChange={(e) => setShowFirst(e.target.checked)}
          />{" "}
          FirstChild
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showManual}
            onChange={(e) => setShowManual(e.target.checked)}
          />{" "}
          Manual
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showAuto}
            onChange={(e) => setShowAuto(e.target.checked)}
          />{" "}
          Auto
        </label>
      </div>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
