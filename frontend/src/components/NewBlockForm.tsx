import React, { useState } from "react";

export type NewBlockPayload = {
  name: string;
  description: string;
  deps: string[];
  code: string;
};

type Props = {
  onCreate: (data: NewBlockPayload) => void;
  onCancel: () => void;
  defaultName?: string;
};

export default function NewBlockForm({
  onCreate,
  onCancel,
  defaultName = "New Block",
}: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [depsInput, setDepsInput] = useState(""); // カンマ区切り
  const [code, setCode] = useState("");

  const submit = () => {
    onCreate({
      name: name.trim() || "New Block",
      description,
      deps: depsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      code,
    });
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
      <div className="flex items-center gap-2">
        <label className="w-24 text-zinc-400">名前</label>
        <input
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="block name"
        />
      </div>

      <div className="flex items-start gap-2">
        <label className="w-24 pt-1 text-zinc-400">説明</label>
        <textarea
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="what this block does"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="w-24 text-zinc-400">依存先</label>
        <input
          className="flex-1 rounded bg-zinc-800 px-2 py-1 text-gray-200"
          value={depsInput}
          onChange={(e) => setDepsInput(e.target.value)}
          placeholder="comma separated (e.g. fetchUser, utils/format)"
        />
      </div>

      <div className="flex items-start gap-2">
        <label className="w-24 pt-1 text-zinc-400">コード</label>
        <textarea
          className="flex-1 rounded bg-zinc-800 px-2 py-1 font-mono text-gray-200"
          rows={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// paste code here"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="rounded bg-zinc-700 px-3 py-1 hover:bg-zinc-600"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-1 hover:bg-blue-500"
          onClick={submit}
        >
          追加
        </button>
      </div>
    </div>
  );
}
