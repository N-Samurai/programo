import type { NodeModel } from "@minoru/react-dnd-treeview";

export type Kind = "folder" | "file"; // ← block はツリーに出さない
export type NodeData = { kind: Kind };
export type AppNode = NodeModel<NodeData>;
