// src/components/GraphView.tsx
import React, { useEffect, useMemo, useRef } from "react";
import cytoscape, { Core, ElementsDefinition } from "cytoscape";
import { useOutlineStore } from "../store/outline";

export default function GraphView() {
  const rootId = useOutlineStore((s) => s.rootId);
  const nodes = useOutlineStore((s) => s.nodes);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  // ------- エッジ生成（固定ルール） -------
  const elements: ElementsDefinition = useMemo(() => {
    const els: ElementsDefinition = { nodes: [], edges: [] };

    // ノード（ルート以外）
    for (const id of Object.keys(nodes)) {
      if (id === rootId) continue;
      const n = nodes[id];
      if (!n) continue;
      els.nodes!.push({
        data: { id, label: n.name || id },
        classes: "normal",
      });
    }

    // 兄弟チェーン + 親→最初の子
    for (const pid of Object.keys(nodes)) {
      const p = nodes[pid];
      if (!p) continue;
      const kids = p.children ?? [];
      if (kids.length === 0) continue;

      // 親→最初の子（親がルートのときは線を出さないならここをスキップ）
      if (pid !== rootId && nodes[kids[0]]) {
        els.edges!.push({
          data: { id: `pc:${pid}->${kids[0]}`, source: pid, target: kids[0] },
          classes: "edge-parent-primary",
        });
      }

      // 兄弟の順でつなぐ
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i];
        const b = kids[i + 1];
        if (!nodes[a] || !nodes[b]) continue;
        els.edges!.push({
          data: { id: `sib:${a}->${b}`, source: a, target: b },
          classes: "edge-sibling",
        });
      }
    }

    // 手動リンク
    for (const id of Object.keys(nodes)) {
      if (id === rootId) continue;
      const n = nodes[id];
      if (!n) continue;
      for (const to of n.manualLinks ?? []) {
        if (!nodes[to] || to === id) continue;
        els.edges!.push({
          data: { id: `man:${id}->${to}`, source: id, target: to },
          classes: "edge-manual",
        });
      }
    }

    return els;
  }, [nodes, rootId]);

  // ------- Cytoscape 初期化（1回だけ） -------
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [], // 初期は空。後続エフェクトで追加
      wheelSensitivity: 0.2,
      style: [
        // ノード
        {
          selector: "node",
          style: {
            "background-color": "#4f46e5",
            "border-width": 2,
            "border-color": "#a5b4fc",
            label: "data(label)",
            color: "#fff",
            "font-size": 14,
            "text-outline-width": 2,
            "text-outline-color": "#4f46e5",
            "text-valign": "center",
            "text-halign": "center",
            width: 44,
            height: 44,
            shape: "round-rectangle",
          },
        },
        // style: [...] 内

        // 兄弟
        {
          selector: ".edge-sibling",
          style: {
            width: 3,
            "line-color": "#9ca3af",
            "curve-style": "bezier", // 好みで "straight" でもOK
            // "target-arrow-shape": "triangle",   ← 削除
            // "target-arrow-color": "#9ca3af",    ← 削除
          },
        },
        // 親→最初の子
        {
          selector: ".edge-parent-primary",
          style: {
            width: 2.5,
            "line-color": "#cbd5e1",
            "curve-style": "bezier",
            // 矢印系削除
          },
        },
        // 手動リンク
        {
          selector: ".edge-manual",
          style: {
            width: 3,
            "line-color": "#f59e0b",
            "curve-style": "bezier",
            // 矢印系削除
          },
        },
      ],
      layout: { name: "preset" } as any, // レイアウトは後で
    });

    cyRef.current = cy;

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  // ------- 要素の差し替え（nodes が変わったら） -------
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().remove();
      if (elements.nodes) cy.add(elements.nodes as any);
      if (elements.edges) cy.add(elements.edges as any);
    });

    const layout = cy.layout({
      name: "cose",
      animate: false,
      padding: 30,
      nodeRepulsion: 80000,
      idealEdgeLength: 120,
    } as any);

    layout.run();

    // ★ レイアウト終了後に全体を少し引きで表示
    //   padding を大きめにすると“引き”になります（好みで 60〜120）
    cy.fit(undefined, 80);

    // さらに拡大し過ぎ防止（オプション）
    cy.minZoom(0.3);
    cy.maxZoom(2.5);
  }, [elements]);

  return (
    <div className="h-full w-full bg-zinc-900">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
