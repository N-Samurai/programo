// src/components/BlockItem.tsx
import React, { useState } from "react";
import type { Block } from "../types/blocks";
import NewBlockForm, { NewBlockPayload } from "./NewBlockForm";

type Props = {
  block: Block;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onAddChild: (parentId: string, data: NewBlockPayload) => void;
  // ★ 追加：dnd-kit のドラッグハンドル用 props（任意）
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export default function BlockItem({
  block,
  onRename,
  onUpdate,
  onAddChild,
  dragHandleProps,
}: Props) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      {/* header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="w-6 text-zinc-400"
            onClick={() => setOpen(!open)}
            title={open ? "折りたたむ" : "展開"}
          >
            {open ? "▾" : "▸"}
          </button>

          {/* ★ ドラッグハンドル */}
          <button
            className="cursor-grab text-zinc-400"
            title="ドラッグして並べ替え"
            {...dragHandleProps}
          >
            ≡
          </button>

          <input
            className="ml-2 rounded bg-zinc-800 px-2 py-1 text-gray-200"
            value={block.name}
            onChange={(e) => onRename(block.id, e.target.value)}
          />
        </div>

        <button
          className="rounded bg-emerald-600 px-2 py-1 text-sm hover:bg-emerald-500"
          onClick={() => setAdding(true)}
        >
          ＋ 子ブロック
        </button>
      </div>

      {open && (
        <div className="space-y-3">
          {/* 説明 */}
          <div className="flex items-start gap-2">
            <label className="w-24 pt-1 text-zinc-400">説明</label>
            <textarea
              className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
              rows={3}
              value={block.description}
              onChange={(e) =>
                onUpdate(block.id, { description: e.target.value })
              }
            />
          </div>

          {/* 依存先 */}
          <div className="flex items-center gap-2">
            <label className="w-24 text-zinc-400">依存先</label>
            <input
              className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
              value={block.deps.join(", ")}
              onChange={(e) =>
                onUpdate(block.id, {
                  deps: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="comma separated"
            />
          </div>

          {/* コード */}
          <div className="flex items-start gap-2">
            <label className="w-24 pt-1 text-zinc-400">コード</label>
            <textarea
              className="flex-1 rounded bg-zinc-800 px-2 py-1 font-mono text-gray-200"
              rows={10}
              value={block.code}
              onChange={(e) => onUpdate(block.id, { code: e.target.value })}
              placeholder="// your code"
            />
          </div>

          {/* 子ブロック 新規作成 */}
          {adding && (
            <NewBlockForm
              onCancel={() => setAdding(false)}
              onCreate={(data) => {
                onAddChild(block.id, data);
                setAdding(false);
              }}
              defaultName="Child Block"
            />
          )}

          {/* 子リストは親側コンポーネントで描画します（↓で作る SortableBlockList が担当） */}
        </div>
      )}
    </div>
  );
}
