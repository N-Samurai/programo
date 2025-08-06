import React, { useState } from "react";
import type { Block } from "../types/blocks";
import BlockItem from "./BlockItem";
import NewBlockForm, { NewBlockPayload } from "./NewBlockForm";

type Props = {
  fileId: string | number;
  fileName: string;
  blocks: Block[];
  onAdd: (parentId: string | null, data: NewBlockPayload) => void; // parentId=null ならトップレベル
  onRename: (blockId: string, name: string) => void;
  onUpdate: (blockId: string, patch: Partial<Block>) => void;
};

export default function FileBlocks({
  fileId,
  fileName,
  blocks,
  onAdd,
  onRename,
  onUpdate,
}: Props) {
  const [addingRoot, setAddingRoot] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {fileName}（ブロック）
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
            onAdd(null, data); // ファイル直下
            setAddingRoot(false);
          }}
        />
      )}

      <div className="space-y-3">
        {blocks.map((b) => (
          <BlockItem
            key={b.id}
            block={b}
            onRename={onRename}
            onUpdate={onUpdate}
            onAddChild={(parentId, data) => onAdd(parentId, data)}
          />
        ))}
      </div>
    </div>
  );
}
