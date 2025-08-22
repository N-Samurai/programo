// src/lib/links.ts
import { Edge, OutlineNode } from "../types/outline";

/** 自動リンクを都度導出（保存しない） */
export function deriveAutoEdges(nodes: Record<string, OutlineNode>): Edge[] {
  const edges: Edge[] = [];

  for (const n of Object.values(nodes)) {
    const kids = n.children;
    if (kids.length > 0) {
      // 親→代表（最初の子のみ）
      edges.push({ from: n.id, to: kids[0], kind: "parent-primary" });
      // 兄弟チェーン
      for (let i = 0; i < kids.length - 1; i++) {
        edges.push({ from: kids[i], to: kids[i + 1], kind: "sibling" });
      }
    }
    // 手動リンク
    for (const to of n.manualLinks) {
      edges.push({ from: n.id, to, kind: "manual" });
    }
  }
  return edges;
}

/** [[id:...]] または [[名前]] を解決して NodeID を返す */
export function resolveWikiLink(
  input: string,
  nodes: Record<string, OutlineNode>
): string | null {
  const idm = input.match(/\[\[\s*id:([a-z0-9-]+)\s*\]\]/i);
  if (idm) return idm[1];

  const nm = input.match(/\[\[\s*([^\]]+?)\s*\]\]/);
  if (nm) {
    const name = nm[1].trim();
    const hit = Object.values(nodes).find((n) => n.name === name);
    return hit?.id ?? null;
  }
  return null;
}
