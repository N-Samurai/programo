import React, { useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { AppNode, Kind } from "../types/tree";
import type { Block } from "../types/blocks";

import Sidebar from "../components/Sidebar";
import SortableBlockList from "../components/SortableBlockList";
import NewBlockForm, { NewBlockPayload } from "../components/NewBlockForm";

// 初期ツリー（フォルダ/ファイルのみ）
const initialTree: AppNode[] = [
  {
    id: "docs",
    parent: 0,
    text: "docs",
    droppable: true,
    data: { kind: "folder" },
  },
  {
    id: "file-1",
    parent: "docs",
    text: "New File",
    droppable: false,
    data: { kind: "file" },
  },
  {
    id: "src",
    parent: 0,
    text: "src",
    droppable: true,
    data: { kind: "folder" },
  },
  {
    id: "index-tsx",
    parent: "src",
    text: "index.tsx",
    droppable: false,
    data: { kind: "file" },
  },
];

export default function MainView() {
  // フォルダ/ファイルのツリー
  const [tree, setTree] = useState<AppNode[]>(initialTree);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // ファイルID -> ブロック配列
  const [blocksByFile, setBlocksByFile] = useState<Record<string, Block[]>>({});

  // 右上の「＋ Block」フォーム表示
  const [addingRoot, setAddingRoot] = useState(false);

  const selectedNode = useMemo<AppNode | null>(
    () => tree.find((n) => n.id === selectedId) ?? null,
    [tree, selectedId]
  );

  // Sidebar（フォルダ/ファイル）D&D
  const handleDrop = (newTree: AppNode[]) => setTree(newTree);
  const canDrop = (treeData: AppNode[], { dropTargetId }: any) => {
    if (dropTargetId === 0) return true; // root直下
    const tgt = treeData.find((n) => n.id === dropTargetId);
    return !!tgt && tgt.droppable === true; // フォルダのみ
  };

  // フォルダ/ファイルの作成・改名
  const renameNode = (id: string | number, name: string) => {
    setTree((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text: name } : n))
    );
  };
  const createNode = (k: Kind) => {
    const id = crypto.randomUUID();
    const sel = selectedId ? tree.find((n) => n.id === selectedId) : undefined;
    const parent = !sel ? 0 : sel?.droppable ? sel.id : sel?.parent ?? 0;
    const text = k === "folder" ? "New Folder" : "New File";
    setTree((prev) => [
      ...prev,
      { id, parent, text, droppable: k === "folder", data: { kind: k } },
    ]);
    setSelectedId(id);
  };

  // ----- ブロック（ファイル内の配列） -----
  const fileBlocks = (fileId: string | number) =>
    blocksByFile[String(fileId)] ?? [];

  // 追加（parentId=null でファイル直下）
  const addBlock = (
    fileId: string | number,
    parentId: string | null,
    data: NewBlockPayload
  ) => {
    const newBlock: Block = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      deps: data.deps,
      code: data.code,
      children: [],
    };
    const key = String(fileId);
    setBlocksByFile((prev) => {
      const cur = prev[key] ?? [];
      const next =
        parentId === null
          ? [...cur, newBlock]
          : addChild(cur, parentId, newBlock);
      return { ...prev, [key]: next };
    });
  };

  // ブロックのユーティリティ
  const addChild = (nodes: Block[], parentId: string, child: Block): Block[] =>
    nodes.map((n) =>
      n.id === parentId
        ? { ...n, children: [...n.children, child] }
        : { ...n, children: addChild(n.children, parentId, child) }
    );

  const patchNode = (
    nodes: Block[],
    id: string,
    patch: Partial<Block>
  ): Block[] =>
    nodes.map((n) =>
      n.id === id
        ? { ...n, ...patch }
        : { ...n, children: patchNode(n.children, id, patch) }
    );

  const renameBlock = (
    fileId: string | number,
    blockId: string,
    name: string
  ) => {
    const key = String(fileId);
    setBlocksByFile((prev) => ({
      ...prev,
      [key]: patchNode(prev[key] ?? [], blockId, { name }),
    }));
  };

  const updateBlock = (
    fileId: string | number,
    blockId: string,
    patch: Partial<Block>
  ) => {
    const key = String(fileId);
    setBlocksByFile((prev) => ({
      ...prev,
      [key]: patchNode(prev[key] ?? [], blockId, patch),
    }));
  };

  // 兄弟内の並べ替え（同じ親の中だけ）
  const reorder = <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    return copy;
  };
  const reorderWithin = (
    fileId: string | number,
    parentId: string | null,
    fromIndex: number,
    toIndex: number
  ) => {
    const key = String(fileId);
    setBlocksByFile((prev) => {
      const cur = prev[key] ?? [];
      if (parentId === null) {
        return { ...prev, [key]: reorder(cur, fromIndex, toIndex) };
      }
      const recur = (nodes: Block[]): Block[] =>
        nodes.map((n) =>
          n.id === parentId
            ? { ...n, children: reorder(n.children, fromIndex, toIndex) }
            : { ...n, children: recur(n.children) }
        );
      return { ...prev, [key]: recur(cur) };
    });
  };

  // ネスト再帰レンダラ（ファイルIDに紐づけ）
  const renderChildren =
    (fileId: string | number) => (parentId: string, children: Block[]) =>
      (
        <SortableBlockList
          parentId={parentId}
          blocks={children}
          onReorder={(from, to) => reorderWithin(fileId, parentId, from, to)}
          onRename={(blockId, name) => renameBlock(fileId, blockId, name)}
          onUpdate={(blockId, patch) => updateBlock(fileId, blockId, patch)}
          onAddChild={(pId, data) => addBlock(fileId, pId, data)}
          renderChildren={renderChildren(fileId)} // 再帰
        />
      );

  // ====== ここから描画 ======
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-zinc-900 text-gray-200 font-mono text-sm">
        {/* 左：フォルダ/ファイル */}
        <Sidebar
          tree={tree}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={createNode}
          onRename={renameNode}
          onDrop={handleDrop}
          canDrop={canDrop}
        />

        {/* 右：ファイルを選んだらブロック一覧 */}
        <main className="flex-1 overflow-auto bg-zinc-800 p-4">
          {!selectedNode && (
            <div className="text-gray-400">
              左のツリーからファイルを選択してください
            </div>
          )}

          {selectedNode?.data?.kind === "file" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {selectedNode.text}（ブロック）
                </h2>
                <button
                  className="rounded bg-blue-600 px-3 py-1 hover:bg-blue-500"
                  onClick={() => setAddingRoot(true)}
                >
                  ＋ Block
                </button>
              </div>

              {addingRoot && (
                <NewBlockForm
                  onCancel={() => setAddingRoot(false)}
                  onCreate={(data) => {
                    addBlock(selectedNode.id, null, data);
                    setAddingRoot(false);
                  }}
                />
              )}

              {/* 兄弟だけ並べ替え可能なリスト（再帰） */}
              <SortableBlockList
                parentId={null}
                blocks={fileBlocks(selectedNode.id)}
                onReorder={(from, to) =>
                  reorderWithin(selectedNode.id, null, from, to)
                }
                onRename={(blockId, name) =>
                  renameBlock(selectedNode.id, blockId, name)
                }
                onUpdate={(blockId, patch) =>
                  updateBlock(selectedNode.id, blockId, patch)
                }
                onAddChild={(parentId, data) =>
                  addBlock(selectedNode.id, parentId, data)
                }
                renderChildren={renderChildren(selectedNode.id)}
              />
            </div>
          )}
        </main>
      </div>
    </DndProvider>
  );
}
