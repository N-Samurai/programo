import React, { useMemo, useState } from "react";
import { useOutlineStore } from "../store/outline";

// ===============
// CardGraphView
// - Top row: children of the current focus node, laid out HORIZONTALLY as cards
// - Inside each card: that node's direct children, laid out VERTICALLY (list)
// - Deeper levels are hidden until you click (drill‑in). Click any item to
//   make it the new focus. Includes a breadcrumb (Home → … → Focus).
// ===============

// Minimal node shape expected from the store
// (matches what GraphView.tsx already uses: id, name, children[], manualLinks[])
type OutlineNode = {
  id: string;
  name: string;
  children?: string[];
  manualLinks?: string[];
};

type NodesMap = Record<string, OutlineNode>;

export default function CardGraphView() {
  const rootId = useOutlineStore((s) => s.rootId);
  const nodes = useOutlineStore((s) => s.nodes) as NodesMap;

  // Which node we are centering the view on
  const [focusId, setFocusId] = useState<string>(rootId);

  // ---------- helpers ----------
  const getNode = (id?: string) => (id ? nodes[id] : undefined);
  const getChildren = (id?: string) =>
    id && nodes[id]?.children
      ? nodes[id]!.children!.filter((c) => !!nodes[c])
      : [];

  // build ancestors path (root -> parent -> focus)
  const breadcrumbs = useMemo(() => {
    const path: string[] = [];

    if (!focusId) return path;

    // naive upward scan using parent lookup by search
    const parentOf = (id: string) => {
      for (const pid of Object.keys(nodes)) {
        if (nodes[pid]?.children?.includes(id)) return pid;
      }
      return undefined;
    };

    let cur: string | undefined = focusId;
    const stack: string[] = [];
    while (cur) {
      stack.push(cur);
      if (cur === rootId) break;
      cur = parentOf(cur);
      if (!cur) break;
    }
    return stack.reverse();
  }, [focusId, nodes, rootId]);

  const focusChildren = useMemo(
    () => getChildren(focusId),
    [focusId, getChildren]
  );

  // counts for current row and the next level (grandchildren)
  const topCount = focusChildren.length;
  const nextLevelTotal = useMemo(
    () => focusChildren.reduce((acc, id) => acc + getChildren(id).length, 0),
    [focusChildren, getChildren]
  );

  // ---------- UI building blocks ----------
  const Card: React.FC<
    { id: string } & React.HTMLAttributes<HTMLDivElement>
  > = ({ id, className = "", ...rest }) => {
    const n = getNode(id);
    if (!n) return null;
    const kids = getChildren(id);

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFocusId(id)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && setFocusId(id)
        }
        className={
          "group relative min-w-[18rem] max-w-[22rem] rounded-2xl border border-zinc-700 bg-zinc-800/80 shadow-xl ring-1 ring-black/5 transition cursor-pointer " +
          "hover:border-zinc-500 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/60 " +
          className
        }
        {...rest}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div className="text-left text-zinc-100/95 group-hover:text-white">
            <div className="line-clamp-2 text-base font-semibold leading-tight">
              {n.name || id}
            </div>
          </div>

          {/* Small stats pill */}
          <div className="ml-2 shrink-0 rounded-full bg-zinc-700/70 px-2 py-0.5 text-xs text-zinc-200">
            {kids.length}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

        {/* Children list (vertical) */}
        <div className="px-3 pb-3">
          {kids.length === 0 ? (
            <div className="px-2 py-3 text-sm text-zinc-400">No children</div>
          ) : (
            <ul className="flex flex-col gap-1 pr-1">
              {kids.map((cid) => (
                <li key={cid}>
                  <button
                    className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-700/60 hover:text-white"
                    onClick={() => setFocusId(cid)}
                    title="Drill into this node"
                  >
                    <span className="line-clamp-1 align-middle">
                      {nodes[cid]?.name || cid}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // ---------- render ----------
  const focusNode = getNode(focusId);

  return (
    <div className="h-full w-full overflow-hidden bg-zinc-900 text-zinc-100">
      {/* Top bar: breadcrumbs + actions */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/85 px-4 py-3 backdrop-blur">
        {/* Home */}
        <button
          className="rounded-md border border-zinc-700 px-2 py-1 text-sm hover:border-zinc-500"
          onClick={() => setFocusId(rootId)}
          title="Go to root"
        >
          Home
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm text-zinc-300">
          {breadcrumbs.map((id, i) => (
            <React.Fragment key={id}>
              {i > 0 && <span className="text-zinc-600">/</span>}
              <button
                className={
                  "rounded px-1.5 py-0.5 hover:bg-zinc-800 " +
                  (i === breadcrumbs.length - 1 ? "text-zinc-200" : "")
                }
                onClick={() => setFocusId(id)}
              >
                {nodes[id]?.name || id}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="ml-auto text-xs text-zinc-500">
          Focus:{" "}
          <span className="text-zinc-300">{focusNode?.name || focusId}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="h-[calc(100%-48px)] overflow-auto">
        {/* Row title */}
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            Children of {focusNode?.name || focusId}{" "}
            <span className="text-zinc-500">
              (cards: {topCount}, next: {nextLevelTotal})
            </span>
          </h2>
        </div>

        {/* Horizontal scroller of cards */}
        <div className="mt-3 flex gap-3 overflow-x-auto px-4 pb-6 [scrollbar-width:thin]">
          {focusChildren.length === 0 ? (
            <div className="px-2 py-12 text-zinc-500">
              No children at this level
            </div>
          ) : (
            focusChildren.map((id) => <Card key={id} id={id} />)
          )}
        </div>
      </div>
    </div>
  );
}
