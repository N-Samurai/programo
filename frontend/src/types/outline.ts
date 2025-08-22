// src/types/outline.ts
export type NodeID = string;

export type OutlineNode = {
  id: NodeID;
  name: string;
  parentId: NodeID | null;
  children: NodeID[];
  manualLinks: NodeID[];
};

export type EdgeKind = "tree" | "sib" | "first" | "manual" | "auto" | string;

export type Edge = {
  from: NodeID;
  to: NodeID;
  reason?: string;
  kind?: EdgeKind; // ← これを追加（links.ts で使う）
};

export type OutlineState = {
  rootId: NodeID;
  nodes: Record<NodeID, OutlineNode>;
  selectedId: NodeID | null;
};
