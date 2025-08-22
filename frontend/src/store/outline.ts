// src/store/outline.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { NodeID, OutlineNode, OutlineState } from "../types/outline";

type OutlineDoc = OutlineState; // { rootId, nodes, selectedId }

type Project = {
  id: string;
  name: string;
  doc: OutlineDoc;
};

type Store = {
  // プロジェクト管理
  projects: Record<string, Project>;
  currentProjectId: string;

  // 便利に使うために現在プロジェクトの doc をミラー
  rootId: NodeID;
  nodes: Record<NodeID, OutlineNode>;
  selectedId: NodeID | null;

  // プロジェクト操作
  createProject: (name?: string) => string;
  switchProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

  // 既存のアウトライン操作（全て“現在のプロジェクト”に作用）
  select: (id: NodeID | null) => void;
  createChild: (parentId: NodeID, name?: string) => NodeID;
  createSiblingAfter: (id: NodeID, name?: string) => NodeID;
  indent: (id: NodeID) => void;
  outdent: (id: NodeID) => void;
  rename: (id: NodeID, name: string) => void;
  remove: (id: NodeID) => void;

  addManualLink: (from: NodeID, to: NodeID) => void;
  removeManualLink: (from: NodeID, to: NodeID) => void;

  getParentId: (id: NodeID) => NodeID | null;
  moveBefore: (targetId: NodeID, dropBeforeId: NodeID) => void;
};

function makeNode(
  id: NodeID,
  name: string,
  parentId: NodeID | null
): OutlineNode {
  return { id, name, parentId, children: [], manualLinks: [] };
}
function blankDoc(): OutlineDoc {
  const rootId = "root-" + nanoid(6);
  const firstId = nanoid();
  const nodes: Record<NodeID, OutlineNode> = {
    [rootId]: makeNode(rootId, "Root", null),
    [firstId]: makeNode(firstId, "", rootId),
  };
  nodes[rootId].children = [firstId];
  return { rootId, nodes, selectedId: firstId };
}
function insertAfter<T>(arr: T[], needle: T, value: T): T[] {
  const idx = arr.indexOf(needle);
  if (idx === -1) return arr;
  const copy = [...arr];
  copy.splice(idx + 1, 0, value);
  return copy;
}

export const useOutlineStore = create<Store>()(
  persist(
    (set, get) => {
      // 初期プロジェクト
      const firstProjectId = "p-" + nanoid(6);
      const firstProject: Project = {
        id: firstProjectId,
        name: "Project 1",
        doc: blankDoc(),
      };

      const mirrorFrom = (p: Project) => ({
        rootId: p.doc.rootId,
        nodes: p.doc.nodes,
        selectedId: p.doc.selectedId,
      });

      const withCurrent = <T>(fn: (p: Project) => T): T => {
        const s = get();
        return fn(s.projects[s.currentProjectId]);
      };
      const updateCurrent = (fn: (doc: OutlineDoc) => OutlineDoc) => {
        set((s) => {
          const pid = s.currentProjectId;
          const cur = s.projects[pid];
          const nextDoc = fn(cur.doc);
          const nextProjects = {
            ...s.projects,
            [pid]: { ...cur, doc: nextDoc },
          };
          return {
            ...s,
            projects: nextProjects,
            ...mirrorFrom(nextProjects[pid]),
          };
        });
      };

      return {
        projects: { [firstProjectId]: firstProject },
        currentProjectId: firstProjectId,
        ...mirrorFrom(firstProject),

        // ---- プロジェクト操作 ----
        createProject: (name = "New Project") => {
          const id = "p-" + nanoid(6);
          const project: Project = { id, name, doc: blankDoc() };
          set((s) => {
            const projects = { ...s.projects, [id]: project };
            return { ...s, projects };
          });
          // そのまま切り替える
          get().switchProject(id);
          return id;
        },

        switchProject: (id: string) => {
          set((s) => {
            const p = s.projects[id] ?? Object.values(s.projects)[0];
            return { ...s, currentProjectId: p.id, ...mirrorFrom(p) };
          });
        },

        renameProject: (id: string, name: string) =>
          set((s) => ({
            ...s,
            projects: { ...s.projects, [id]: { ...s.projects[id], name } },
          })),

        deleteProject: (id: string) => {
          set((s) => {
            const ids = Object.keys(s.projects);
            if (ids.length <= 1) return s; // 最後の1つは削除不可
            const next = { ...s.projects };
            delete next[id];
            const nextCurrent =
              s.currentProjectId === id
                ? Object.keys(next)[0]
                : s.currentProjectId;
            return {
              ...s,
              projects: next,
              currentProjectId: nextCurrent,
              ...mirrorFrom(next[nextCurrent]),
            };
          });
        },

        // ---- アウトライン操作（現在プロジェクトへ適用）----
        select: (id) => updateCurrent((doc) => ({ ...doc, selectedId: id })),

        createChild: (parentId, name = "") => {
          const id = nanoid();
          updateCurrent((d) => {
            const parent = d.nodes[parentId];
            if (!parent) return d;
            return {
              ...d,
              nodes: {
                ...d.nodes,
                [id]: makeNode(id, name, parentId),
                [parentId]: { ...parent, children: [...parent.children, id] },
              },
              selectedId: id,
            };
          });
          return id;
        },

        createSiblingAfter: (id, name = "") => {
          const cur = withCurrent((p) => p.doc.nodes[id]);
          if (!cur || cur.parentId == null) return id;
          const newId = nanoid();
          updateCurrent((d) => {
            const p = d.nodes[cur.parentId!];
            const nextKids = insertAfter(p.children, id, newId);
            return {
              ...d,
              nodes: {
                ...d.nodes,
                [newId]: makeNode(newId, name, cur.parentId),
                [p.id]: { ...p, children: nextKids },
              },
              selectedId: newId,
            };
          });
          return newId;
        },

        indent: (id) =>
          updateCurrent((d) => {
            const cur = d.nodes[id];
            if (!cur || cur.parentId == null) return d;
            const parent = d.nodes[cur.parentId];
            const idx = parent.children.indexOf(id);
            if (idx <= 0) return d;
            const newParentId = parent.children[idx - 1];
            const newParent = d.nodes[newParentId];
            if (!newParent) return d;

            const newParentKids = [...newParent.children, id];
            const parentKids = parent.children.filter((x) => x !== id);

            return {
              ...d,
              nodes: {
                ...d.nodes,
                [id]: { ...cur, parentId: newParentId },
                [parent.id]: { ...parent, children: parentKids },
                [newParent.id]: { ...newParent, children: newParentKids },
              },
            };
          }),

        outdent: (id) =>
          updateCurrent((d) => {
            const cur = d.nodes[id];
            if (!cur || cur.parentId == null) return d;
            const parent = d.nodes[cur.parentId];
            const grandId = parent.parentId;
            if (grandId == null) return d;
            const grand = d.nodes[grandId];

            const parentKids = parent.children.filter((x) => x !== id);
            const idxInGrand = grand.children.indexOf(parent.id);
            const grandKids = [...grand.children];
            grandKids.splice(idxInGrand + 1, 0, id);

            return {
              ...d,
              nodes: {
                ...d.nodes,
                [id]: { ...cur, parentId: grandId },
                [parent.id]: { ...parent, children: parentKids },
                [grand.id]: { ...grand, children: grandKids },
              },
            };
          }),

        rename: (id, name) =>
          updateCurrent((d) => ({
            ...d,
            nodes: { ...d.nodes, [id]: { ...d.nodes[id], name } },
          })),

        remove: (id) =>
          updateCurrent((d) => {
            const cur = d.nodes[id];
            if (!cur || cur.parentId == null) return d;
            const nonRoot = Object.keys(d.nodes).filter((k) => k !== d.rootId);
            if (nonRoot.length <= 1) return d; // 最低1行は残す

            const parent = d.nodes[cur.parentId];
            const parentKids = parent.children.filter((x) => x !== id);

            const nextNodes = { ...d.nodes };
            delete nextNodes[id];

            return {
              ...d,
              nodes: {
                ...nextNodes,
                [parent.id]: { ...parent, children: parentKids },
              },
              selectedId: parentKids[0] ?? parent.id,
            };
          }),

        addManualLink: (from, to) =>
          updateCurrent((d) => {
            const n = d.nodes[from];
            if (!n || n.manualLinks.includes(to)) return d;
            return {
              ...d,
              nodes: {
                ...d.nodes,
                [from]: { ...n, manualLinks: [...n.manualLinks, to] },
              },
            };
          }),

        removeManualLink: (from, to) =>
          updateCurrent((d) => {
            const n = d.nodes[from];
            if (!n) return d;
            return {
              ...d,
              nodes: {
                ...d.nodes,
                [from]: {
                  ...n,
                  manualLinks: n.manualLinks.filter((x) => x !== to),
                },
              },
            };
          }),

        getParentId: (id) => {
          const d = withCurrent((p) => p.doc);
          for (const pid of Object.keys(d.nodes)) {
            if (d.nodes[pid].children.includes(id)) return pid;
          }
          return null;
        },

        moveBefore: (targetId, dropBeforeId) =>
          updateCurrent((d) => {
            // 同一親のみ
            let parentId: NodeID | null = null;
            for (const pid of Object.keys(d.nodes)) {
              if (d.nodes[pid].children.includes(targetId)) {
                parentId = pid;
                break;
              }
            }
            if (!parentId) return d;

            const arr = [...d.nodes[parentId].children];
            const fromIdx = arr.indexOf(targetId);
            const toIdx = arr.indexOf(dropBeforeId);
            if (fromIdx === -1 || toIdx === -1) return d;

            arr.splice(fromIdx, 1);
            const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
            arr.splice(insertAt, 0, targetId);

            return {
              ...d,
              nodes: {
                ...d.nodes,
                [parentId]: { ...d.nodes[parentId], children: arr },
              },
            };
          }),
      };
    },
    { name: "outline-projects-v1" }
  )
);
