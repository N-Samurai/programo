import React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import type { Block } from "../types/blocks";
import BlockItem from "./BlockItem";
import type { NewBlockPayload } from "./NewBlockForm";

type Props = {
  parentId: string | null; // null = ファイル直下
  blocks: Block[]; // 兄弟の配列（この順序だけ並べ替える）
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (id: string, name: string) => void;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onAddChild: (parentId: string, data: NewBlockPayload) => void;
  renderChildren: (parentId: string, children: Block[]) => React.ReactNode;
};

export default function SortableBlockList({
  parentId,
  blocks,
  onReorder,
  onRename,
  onUpdate,
  onAddChild,
  renderChildren,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const activeId = e.active.id;
    const overId = e.over?.id;
    if (!overId || activeId === overId) return;

    const oldIndex = blocks.findIndex((b) => b.id === activeId);
    const newIndex = blocks.findIndex((b) => b.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    if (oldIndex !== newIndex) {
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {blocks.map((b) => (
          <React.Fragment key={b.id}>
            <SortableItem id={b.id}>
              <BlockItem
                block={b}
                onRename={onRename}
                onUpdate={onUpdate}
                onAddChild={onAddChild}
                /* dragHandleProps は SortableItem 側で注入 */
              />
            </SortableItem>

            {/* 子リストは SortableItem の外に出す */}
            <div className="mt-3 pl-6">{renderChildren(b.id, b.children)}</div>
          </React.Fragment>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // BlockItem に “ハンドル用の props” を注入
  const child = React.Children.only(children) as React.ReactElement<any>;
  const withHandle = React.cloneElement(child, {
    dragHandleProps: { ...attributes, ...listeners },
  });

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      {withHandle}
    </div>
  );
}
