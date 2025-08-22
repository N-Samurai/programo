// src/components/OutlineRow.tsx
import React, { useEffect, useRef, useState } from "react";
import { useOutlineStore } from "../store/outline";
import type { OutlineNode } from "../types/outline";
import { resolveWikiLink } from "../lib/links";

type Props = {
  id: string;
  depth: number;
};

export default function OutlineRow({ id, depth }: Props) {
  const {
    rootId,
    nodes,
    selectedId,
    select,
    rename,
    createSiblingAfter,
    createChild,
    indent,
    outdent,
    remove,
    addManualLink,
    removeManualLink,
    getParentId,
    moveBefore,
  } = useOutlineStore();

  const n: OutlineNode = nodes[id];
  const ref = useRef<HTMLInputElement>(null);
  const [linkInput, setLinkInput] = useState("");

  // --- DnD state ---
  const dragIdRef = useRef<string | null>(null);
  const [dropPos, setDropPos] = useState<"before" | "after" | null>(null);

  useEffect(() => {
    if (selectedId === id) ref.current?.focus();
  }, [selectedId, id]);

  // ルート以外の描画対象ノード数をカウント
  const renderableCount = Object.keys(nodes).filter((k) => k !== rootId).length;

  // ====== リンク抽出ユーティリティ（複数対応）======
  // 入力文字列から [[...]] と素のトークン（カンマ/空白区切り）をすべて拾う
  const tokenizeLinks = (raw: string): string[] => {
    const tokens: string[] = [];
    const re = /\[\[(.+?)\]\]|([^,\s]+)/g; // [[...]] or plain token
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const token = (m[1] ?? m[2] ?? "").trim();
      if (token) tokens.push(token);
      // 無限ループ防止：空マッチは前進
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return tokens;
  };

  // 複数トークンをノードIDに解決（重複除去）
  const resolveMany = (raw: string): string[] => {
    const ids: string[] = [];
    for (const t of tokenizeLinks(raw)) {
      const target = resolveWikiLink(t, nodes);
      if (target && !ids.includes(target)) ids.push(target);
    }
    return ids;
  };

  // タイトル内の [[...]] をリンクに昇格させ、タイトルからは除去
  const liftInlineLinksFromTitle = (title: string) => {
    const ids = resolveMany(title);
    // すでにあるリンクは除外
    const newIds = ids.filter((x) => !n.manualLinks.includes(x));
    newIds.forEach((to) => addManualLink(id, to));
    // [[...]] を取り除いたタイトルに整形
    const cleaned = title
      .replace(/\[\[(.+?)\]\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned !== title) rename(id, cleaned);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Enter: 同階層に兄弟を追加（空文字で作成）
    if (e.key === "Enter") {
      e.preventDefault();
      liftInlineLinksFromTitle(n.name); // Enter時にも拾っておく
      const newId = createSiblingAfter(id, "");
      select(newId);
      return;
    }
    // Tab / Shift+Tab: 階層操作
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) outdent(id);
      else indent(id);
      return;
    }
    // Backspace: 空行なら削除。ただし最後の1行は残す
    if (e.key === "Backspace" && n.name.trim() === "") {
      e.preventDefault();
      if (renderableCount <= 1) return;
      remove(id);
      return;
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    const ids = resolveMany(linkInput);
    const toAdd = ids.filter((x) => !n.manualLinks.includes(x));
    toAdd.forEach((to) => addManualLink(id, to));
    setLinkInput("");
  };

  // ====== DnD（同一親内で前/後に入れ替え）======
  const onDragStart = (e: React.DragEvent) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDropPos(y < rect.height / 2 ? "before" : "after");
  };
  const onDragLeave = () => setDropPos(null);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = dragIdRef.current;
    setDropPos(null);
    if (!from || from === id) return;

    const pf = getParentId(from);
    const pt = getParentId(id);
    if (!pf || !pt || pf !== pt) {
      dragIdRef.current = null;
      return;
    }

    if (dropPos === "before") {
      moveBefore(from, id);
    } else {
      const siblings = nodes[pt].children;
      const idx = siblings.indexOf(id);
      const nextId = siblings[idx + 1] ?? null;
      if (nextId) moveBefore(from, nextId);
      else {
        const lastBefore = siblings[siblings.length - 1];
        if (lastBefore && lastBefore !== from) moveBefore(from, lastBefore);
      }
    }
    select(from);
    dragIdRef.current = null;
  };

  const dropGuideClass =
    dropPos === "before"
      ? "ring-1 ring-emerald-500/60 border-t border-emerald-400/60"
      : dropPos === "after"
      ? "ring-1 ring-emerald-500/60 border-b border-emerald-400/60"
      : "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group mb-1 flex items-start gap-2 rounded px-1 py-0.5 ${dropGuideClass} ${
        selectedId === id ? "bg-zinc-700/40" : "hover:bg-zinc-800/40"
      }`}
      style={{ paddingLeft: depth * 16 }}
      onClick={() => select(id)}
    >
      <span className="select-none text-zinc-500">•</span>

      <input
        ref={ref}
        className="flex-1 bg-transparent outline-none text-gray-200"
        value={n.name}
        onChange={(e) => rename(id, e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => liftInlineLinksFromTitle(n.name)} // ← フォーカスが外れたら [[...]] を抽出
        placeholder="項目名（[[リンク]] を含めると自動抽出 / Enter=兄弟 / Tab=子 / Shift+Tab=上へ）"
      />

      {/* リンクタグ表示（複数OK） */}
      {n.manualLinks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {n.manualLinks.map((to: string) => (
            <span
              key={to}
              className="rounded bg-amber-700/30 px-1 text-xs text-amber-200"
              title={`[[id:${to}]]`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                removeManualLink(id, to);
              }}
            >
              ↔ {nodes[to]?.name ?? to}
            </span>
          ))}
        </div>
      )}

      {/* 追加 UI（複数貼り付けOK: [[A]] [[B]] C, D） */}
      <div className="ml-2 hidden items-center gap-1 text-xs text-zinc-400 group-hover:flex">
        <input
          className="w-44 rounded bg-zinc-800 px-1 py-0.5 text-gray-200"
          placeholder="[[A]] [[B]] C, D"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
        />
        <button
          className="rounded bg-zinc-700 px-2 py-0.5 hover:bg-zinc-600"
          onClick={handleAddLink}
        >
          +リンク
        </button>
      </div>
    </div>
  );
}
