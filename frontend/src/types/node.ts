// src/types/node.ts
export type NodeKind = "folder" | "file" | "block";

export interface BaseNode {
  id: string;
  name: string;
  kind: NodeKind;
  parentId?: string; // ツリー用
}

export interface BlockNode extends BaseNode {
  kind: "block";
  description: string;
  deps: string[]; // 依存先ID配列
  children: string[]; // ブロック内ブロック
}

export interface FileNode extends BaseNode {
  kind: "file";
  blocks: string[]; // そのファイル直下のブロックID
}

export interface FolderNode extends BaseNode {
  kind: "folder";
  children: string[]; // フォルダ直下のnode ID
}

export type AnyNode = FolderNode | FileNode | BlockNode;

export interface Project {
  id: string;
  rootId: string;
  nodes: Record<string, AnyNode>;
}
