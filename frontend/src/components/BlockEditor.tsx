import React, { useEffect, useState } from "react";
import type { NewBlockPayload } from "./NewBlockForm";

type Kind = "folder" | "file" | "block";

// MainView 側のツリー要素（最小）
export type AppNode = {
  id: string | number;
  parent: string | number;
  text: string;
  droppable?: boolean;
  data?: { kind: Kind };
};

type BlockDetail = { description: string; deps: string[]; code: string };

type Props = {
  node: AppNode; // 現在編集中のブロック
  detail: BlockDetail | undefined; // ブロック詳細（ない場合は空で表示）
  onRename: (name: string) => void; // ツリー上の名称も更新
  onChange: (patch: Partial<BlockDetail>) => void;
  onAddChildRequest: () => void; // 「＋ 子ブロック」クリック時
};

export default function BlockEditor({
  node,
  detail,
  onRename,
  onChange,
  onAddChildRequest,
}: Props) {
  const [name, setName] = useState(String(node.text ?? ""));
  const [description, setDescription] = useState(detail?.description ?? "");
  const [depsInput, setDepsInput] = useState((detail?.deps ?? []).join(", "));
  const [code, setCode] = useState(detail?.code ?? "");

  useEffect(() => {
    setName(String(node.text ?? ""));
    setDescription(detail?.description ?? "");
    setDepsInput((detail?.deps ?? []).join(", "));
    setCode(detail?.code ?? "");
  }, [node.id]); // ノード切替時にフォームを入れ替え

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Block: {node.text}</h2>
        <button
          className="rounded bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-500"
          onClick={onAddChildRequest}
        >
          ＋ 子ブロック
        </button>
      </div>

      {/* 名前 */}
      <div className="flex items-center gap-2">
        <label className="w-24 text-zinc-400">名前</label>
        <input
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onRename(name.trim() || "Unnamed Block")}
        />
      </div>

      {/* 説明 */}
      <div className="flex items-start gap-2">
        <label className="w-24 pt-1 text-zinc-400">説明</label>
        <textarea
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            onChange({ description: e.target.value });
          }}
        />
      </div>

      {/* 依存先（カンマ区切り） */}
      <div className="flex items-center gap-2">
        <label className="w-24 text-zinc-400">依存先</label>
        <input
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          value={depsInput}
          onChange={(e) => {
            setDepsInput(e.target.value);
            const deps = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange({ deps });
          }}
          placeholder="comma separated"
        />
      </div>

      {/* 実コード */}
      <div className="flex items-start gap-2">
        <label className="w-24 pt-1 text-zinc-400">コード</label>
        <textarea
          className="flex-1 rounded bg-zinc-800 px-2 py-1 font-mono text-gray-200"
          rows={12}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            onChange({ code: e.target.value });
          }}
          placeholder="// your code"
        />
      </div>
    </div>
  );
}
