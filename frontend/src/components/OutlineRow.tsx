// src/components/OutlineRow.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutlineStore } from "../store/outline";
import type { OutlineNode } from "../types/outline";
import { resolveWikiLink } from "../lib/links";

type Props = { id: string; depth: number };

// [[...]] の現在入力中スパンを特定
function getBracketSpan(text: string, caret: number) {
  const open = text.lastIndexOf("[[", caret);
  if (open === -1) return null;
  const closeBetween = text.indexOf("]]", open);
  if (closeBetween !== -1 && closeBetween < caret) return null;
  const inner = text.slice(open + 2, caret);
  if (/\n/.test(inner)) return null;
  return { open, close: caret, inner };
}
const score = (name: string, q: string) => {
  const n = (name || "").toLowerCase();
  const s = q.toLowerCase();
  if (!s) return 1;
  if (n.startsWith(s)) return 0;
  if (n.includes(s)) return 1;
  return 2;
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
    moveToEnd,
  } = useOutlineStore();

  const n: OutlineNode = nodes[id];
  const ref = useRef<HTMLInputElement>(null);

  // DnD
  const dragIdRef = useRef<string | null>(null);
  const [dropPos, setDropPos] = useState<"before" | "after" | null>(null);

  // [[...]] サジェスト
  const [acOpen, setAcOpen] = useState(false);
  const [acQuery, setAcQuery] = useState("");
  const [acIndex, setAcIndex] = useState(0);
  const composingRef = useRef(false);

  // リンク編集用
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);

  // ルート以外の行数（最後の1行ガード用）
  const renderableCount = useMemo(
    () => Object.keys(nodes).filter((k) => k !== rootId).length,
    [nodes, rootId]
  );
  const suppressEnterRef = useRef(false);

  useEffect(() => {
    if (selectedId === id) ref.current?.focus();
  }, [selectedId, id]);

  // 補完候補
  const acList = useMemo(() => {
    if (!acOpen) return [];
    const all = Object.values(nodes).filter((x) => x.id !== rootId);
    const ranked = all
      .map((x) => ({
        id: x.id,
        name: x.name || x.id,
        sc: Math.min(
          score(x.name || "", acQuery),
          x.id.startsWith(acQuery) ? 0 : x.id.includes(acQuery) ? 1 : 2
        ),
      }))
      .sort((a, b) => a.sc - b.sc || a.name.localeCompare(b.name))
      .slice(0, 8);
    return ranked;
  }, [acOpen, acQuery, nodes, rootId]);

  // 入力変更（[[...]] 検出 & サジェスト制御）
  const onChange = (val: string) => {
    rename(id, val);
    if (!ref.current) return;
    const caret = ref.current.selectionStart ?? val.length;
    const span = getBracketSpan(val, caret);
    if (composingRef.current || !span) {
      setAcOpen(false);
      setAcQuery("");
      setAcIndex(0);
      return;
    }
    setAcOpen(true);
    setAcQuery(span.inner);
    setAcIndex(0);
  };

  // [[...]] → manualLinks に吸い上げ
  const tokenizeLinks = (raw: string): string[] => {
    const tokens: string[] = [];
    const re = /\[\[(.+?)\]\]|([^,\s]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const token = (m[1] ?? m[2] ?? "").trim();
      if (token) tokens.push(token);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return tokens;
  };
  const resolveMany = (raw: string): string[] => {
    const ids: string[] = [];
    for (const t of tokenizeLinks(raw)) {
      const target = resolveWikiLink(t, nodes);
      if (target && !ids.includes(target)) ids.push(target);
    }
    return ids;
  };
  const liftInlineLinksFromTitle = (title: string) => {
    const ids = resolveMany(title);
    const newIds = ids.filter((x) => !n.manualLinks.includes(x));
    newIds.forEach((to) => addManualLink(id, to));
    const cleaned = title
      .replace(/\[\[(.+?)\]\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned !== title) rename(id, cleaned);
  };

  // サジェスト確定
  // ★ 修正後 applyCompletion（置き換え）
  // ★ これで置き換え
  const applyCompletion = (choice: { id: string; name: string }) => {
    if (!ref.current) return;
    const input = ref.current;
    const text = input.value;
    const caret = input.selectionStart ?? text.length;
    const span = getBracketSpan(text, caret);
    if (!span) return;

    // [[...]] の区切り
    const before = text.slice(0, span.open); // "[[" の手前
    const afterAll = text.slice(span.close); // caret 以降
    const after = afterAll.startsWith("]]") ? afterAll.slice(2) : afterAll; // すでに ]] があれば除去

    // 候補をノードIDに解決して manualLinks に追加（重複チェック）
    const targetId = choice.id; // resolveWikiLink不要：候補は既存ノード
    const already = n.manualLinks.includes(targetId);
    if (!already) addManualLink(id, targetId);

    // タイトルから [[...]] を完全に取り除く（必要ならスペース1つ残す）
    const needSpace =
      before && after && !/\s$/.test(before) && !/^\s/.test(after);
    const cleaned = before + (needSpace ? " " : "") + after;

    rename(id, cleaned);

    // キャレットは除去した位置（before の末尾）へ
    const newCaret = (before + (needSpace ? " " : "")).length;
    requestAnimationFrame(() => {
      input.setSelectionRange(newCaret, newCaret);
      input.focus();
    });

    // サジェストを閉じ、Enter抑止（同フレームで兄弟作成しない）
    setAcOpen(false);
    setAcQuery("");
    setAcIndex(0);
    suppressEnterRef.current = true;
    setTimeout(() => (suppressEnterRef.current = false), 0);
  };

  // 入力キー処理
  const onKeyDown = (e: React.KeyboardEvent) => {
    // IME 中はショートカット無効
    // @ts-ignore
    if (e.nativeEvent?.isComposing) return;

    // ★ 補完確定直後の Enter を食い止める
    if (e.key === "Enter" && suppressEnterRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // ==== ここを最優先に（補完中のキー処理）====
    if (acOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAcIndex((i) => Math.min(i + 1, acList.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAcIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        // ★ Enter/Tab で候補を確定して、兄弟作成は発火させない
        if (acList[acIndex]) {
          e.preventDefault();
          e.stopPropagation();
          applyCompletion(acList[acIndex]); // ← ここで suppressEnterRef を立てる
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAcOpen(false);
        return;
      }
    }
    // ==== 補完以外の通常処理はこの下に ====

    // "[[" の自動補完（既存）
    if (e.key === "[") {
      const input = ref.current;
      if (input) {
        const pos = input.selectionStart ?? input.value.length;
        const prev = input.value[pos - 1];
        if (prev === "[") {
          e.preventDefault();
          const before = input.value.slice(0, pos - 1);
          const after = input.value.slice(pos);
          const next = `${before}[[]]${after}`;
          rename(id, next);
          const caret = before.length + 2;
          requestAnimationFrame(() => {
            input.setSelectionRange(caret, caret);
            input.focus();
          });
          setAcOpen(true);
          setAcQuery("");
          setAcIndex(0);
          return;
        }
      }
    }

    // 既存の Enter（兄弟作成）
    if (e.key === "Enter") {
      e.preventDefault();
      liftInlineLinksFromTitle(n.name);
      const newId = createSiblingAfter(id, "");
      select(newId);
      return;
    }

    // 既存の Tab / Shift+Tab
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) outdent(id);
      else indent(id);
      return;
    }

    // 既存の Backspace（空行削除）
    if (e.key === "Backspace" && n.name.trim() === "") {
      e.preventDefault();
      if (renderableCount <= 1) return;
      remove(id);
      return;
    }

    // ']' スキップ（]] 重複防止）
    if (e.key === "]") {
      const input = ref.current;
      if (input) {
        const pos = input.selectionStart ?? input.value.length;
        const two = input.value.slice(pos, pos + 2);
        const one = input.value.slice(pos, pos + 1);
        if (two === "]]") {
          e.preventDefault();
          const np = pos + 2;
          requestAnimationFrame(() => input.setSelectionRange(np, np));
          setAcOpen(false);
          return;
        }
        if (one === "]") {
          e.preventDefault();
          const np = pos + 1;
          requestAnimationFrame(() => input.setSelectionRange(np, np));
          setAcOpen(false);
          return;
        }
      }
    }

    // ↑↓: 兄弟間のフォーカス移動（任意）
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const pt = getParentId(id);
      if (!pt) return;
      const siblings = nodes[pt].children;
      const idx = siblings.indexOf(id);
      if (e.key === "ArrowUp" && idx > 0) select(siblings[idx - 1]);
      if (e.key === "ArrowDown" && idx < siblings.length - 1)
        select(siblings[idx + 1]);
      return;
    }
  };

  // DnD（同一親内）
  const onDragStart = (e: React.DragEvent) => {
    dragIdRef.current = id;
    e.dataTransfer.setData("text/plain", id);
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
  const onDragEnd = () => {
    dragIdRef.current = null;
    setDropPos(null);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = dragIdRef.current || e.dataTransfer.getData("text/plain");
    setDropPos(null);
    if (!from || from === id) return;
    const pf = getParentId(from);
    const pt = getParentId(id);
    if (!pf || !pt || pf !== pt) return; // 同一親のみ

    if (dropPos === "before") {
      moveBefore(from, id);
    } else {
      const siblings = nodes[pt].children;
      const idx = siblings.indexOf(id);
      const nextId = siblings[idx + 1] ?? null;
      if (nextId) moveBefore(from, nextId);
      else moveToEnd(from, pt);
    }
    select(from);
    dragIdRef.current = null;
  };

  // 追加済みリンク 編集確定
  const commitEditLink = () => {
    if (!editingLinkId) return;
    const resolved = resolveWikiLink(editingText.trim(), nodes);
    if (resolved && resolved !== editingLinkId) {
      removeManualLink(id, editingLinkId);
      addManualLink(id, resolved);
    }
    setEditingLinkId(null);
    setEditingText("");
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative mb-1 flex items-start gap-2 rounded px-1 py-0.5 ${
        dropPos === "before"
          ? "border-t-2 border-emerald-500/70"
          : dropPos === "after"
          ? "border-b-2 border-emerald-500/70"
          : ""
      } ${selectedId === id ? "bg-zinc-700/40" : "hover:bg-zinc-800/40"}`}
      style={{ paddingLeft: depth * 16 }}
      onClick={() => select(id)}
    >
      {/* ドラッグハンドル */}
      <span
        role="button"
        title="ドラッグで並べ替え"
        draggable
        onDragStart={onDragStart}
        className="mt-1 select-none cursor-grab text-zinc-500 hover:text-zinc-300"
      >
        ⋮⋮
      </span>

      {/* 入力 */}
      <div className="relative flex-1">
        <input
          ref={ref}
          draggable={false}
          className="w-full bg-transparent outline-none text-gray-200"
          value={n.name}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => {
            if (e.key === "Enter" && suppressEnterRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          placeholder="項目名（[[で候補 / Enter=兄弟 / Tab=子 / Shift+Tab=上へ）"
        />

        {/* [[...]] サジェスト */}
        {acOpen && acList.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-[28rem] overflow-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
            {acList.map((c, i) => (
              <button
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // blur防止
                  applyCompletion(c);
                }}
                className={`flex w-full items-center justify-between px-2 py-1 text-left text-sm ${
                  i === acIndex ? "bg-zinc-800" : "hover:bg-zinc-800/70"
                }`}
              >
                <span className="truncate text-zinc-100">{c.name}</span>
                <span className="ml-2 shrink-0 text-xs text-zinc-500">
                  {c.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 追加済みリンク（クリックで編集 / ダブルクリックで削除） */}
      {/* 追加済みリンク（クリックで削除確認のポップアップ） */}
      {n.manualLinks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {n.manualLinks.map((to: string) => {
            const showConfirm = confirmDelId === to;
            return (
              <span key={to} className="relative inline-flex items-center">
                <button
                  className="rounded bg-amber-700/30 px-1 text-xs text-amber-200 hover:bg-amber-700/40"
                  title={`[[id:${to}]]（クリックで削除確認）`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelId(showConfirm ? null : to);
                  }}
                >
                  ↔ {nodes[to]?.name ?? to}
                </button>

                {showConfirm && (
                  <div
                    className="absolute z-20 -right-1 top-full mt-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                    onMouseLeave={() => setConfirmDelId(null)}
                  >
                    <div className="mb-1 text-zinc-200 whitespace-nowrap">
                      このリンクを削除しますか？
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded bg-zinc-700 px-2 py-0.5 hover:bg-zinc-600"
                        onClick={() => setConfirmDelId(null)}
                      >
                        キャンセル
                      </button>
                      <button
                        className="rounded bg-red-700 px-2 py-0.5 text-white hover:bg-red-600"
                        onClick={() => {
                          removeManualLink(id, to);
                          setConfirmDelId(null);
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
