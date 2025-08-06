import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export type NodeKind = "folder" | "file" | "block";
export interface BaseNode {
  id: string;
  name: string;
  kind: NodeKind;
  parentId?: string;
}
export interface FolderNode extends BaseNode {
  kind: "folder";
  children: string[];
}
export interface FileNode extends BaseNode {
  kind: "file";
  blocks: string[];
}
export interface BlockNode extends BaseNode {
  kind: "block";
  description: string;
  deps: string[];
  children: string[];
}
export type AnyNode = FolderNode | FileNode | BlockNode;

export interface Project {
  id: string;
  rootId: string;
  nodes: Record<string, AnyNode>;
}

type ProjectState = {
  project: Project;
  selectedId?: string;
  select: (id: string) => void;
  addNode: (kind: NodeKind, name: string, parentId?: string) => string;
  renameNode: (id: string, newName: string) => void;
  updateBlock: (
    id: string,
    patch: { name?: string; description?: string; deps?: string[] }
  ) => void;
  moveNode: (id: string, newParentId: string) => void;
  resetAll: () => void; // デバッグ用
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: {
        id: "default",
        rootId: "root",
        nodes: {
          root: { id: "root", name: "root", kind: "folder", children: [] },
        },
      },
      selectedId: "root",

      select: (id) => set({ selectedId: id }),

      addNode: (kind, name, parentId = "root") => {
        const id = nanoid();
        set((state) => {
          const nodes = { ...state.project.nodes };
          // 新ノード作成
          if (kind === "folder") {
            nodes[id] = { id, name, kind, parentId, children: [] };
          } else if (kind === "file") {
            nodes[id] = { id, name, kind, parentId, blocks: [] };
          } else {
            nodes[id] = {
              id,
              name,
              kind,
              parentId,
              description: "",
              deps: [],
              children: [],
            };
          }
          // 親にぶら下げ
          const parent = nodes[parentId] as any;
          if (parent?.children && kind !== "block") {
            if (!parent.children.includes(id)) parent.children.push(id);
          }
          if (parent?.blocks && kind === "block") {
            if (!parent.blocks.includes(id)) parent.blocks.push(id);
          }
          return { project: { ...state.project, nodes } };
        });
        return id;
      },

      renameNode: (id, newName) =>
        set((state) => {
          const nodes = { ...state.project.nodes };
          const node = nodes[id];
          if (!node) return state;
          nodes[id] = { ...node, name: newName };
          return { project: { ...state.project, nodes } };
        }),

      updateBlock: (id, patch) =>
        set((state) => {
          const node = state.project.nodes[id];
          if (!node || node.kind !== "block") return state;
          return {
            project: {
              ...state.project,
              nodes: { ...state.project.nodes, [id]: { ...node, ...patch } },
            },
          };
        }),

      // 🔒 安全な移動（root禁止・自己参照禁止・子孫チェック・重複防止）
      moveNode: (id, newParentId) => {
        console.log("[moveNode]", id, "->", newParentId); // ★追加
        set((state) => {
          const { nodes } = state.project;
          const copy: Record<string, AnyNode> = { ...nodes };
          const node = copy[id];
          if (!node) return state;

          // rootは移動禁止 / 自己参照禁止
          if (id === state.project.rootId || id === newParentId) return state;

          // 子孫への移動は循環になるので禁止
          const isAncestorOf = (ancestorId: string, targetId: string) => {
            let cur = copy[targetId]?.parentId as string | undefined;
            while (cur) {
              if (cur === ancestorId) return true;
              cur = copy[cur]?.parentId as string | undefined;
            }
            return false;
          };
          if (isAncestorOf(id, newParentId)) return state;

          // 古い親から外す
          if ((node as any).parentId) {
            const oldParent = copy[(node as any).parentId] as any;
            if (oldParent?.children) {
              oldParent.children = oldParent.children.filter(
                (cid: string) => cid !== id
              );
            }
            if (oldParent?.blocks) {
              oldParent.blocks = oldParent.blocks.filter(
                (cid: string) => cid !== id
              );
            }
          }

          // 新しい親へ追加（フォルダはchildren、ファイルならblocks、ブロックの中はchildren）
          const newParent = copy[newParentId] as any;
          if (!newParent) return state;

          if (newParent?.children && node.kind !== "block") {
            if (!newParent.children.includes(id)) newParent.children.push(id);
          }
          if (newParent?.blocks && node.kind === "block") {
            if (!newParent.blocks.includes(id)) newParent.blocks.push(id);
          }
          if (
            newParent?.children &&
            node.kind === "block" &&
            newParent.kind === "block"
          ) {
            if (!newParent.children.includes(id)) newParent.children.push(id);
          }

          (node as any).parentId = newParentId;

          return { project: { ...state.project, nodes: copy } };
        });
      },

      // データ初期化（persistの壊れデータ対策）
      resetAll: () =>
        set({
          project: {
            id: "default",
            rootId: "root",
            nodes: {
              root: { id: "root", name: "root", kind: "folder", children: [] },
            },
          },
          selectedId: "root",
        }),
    }),
    { name: "programo-storage" }
  )
);
