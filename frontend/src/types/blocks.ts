export type Block = {
  id: string;
  name: string;
  description: string;
  deps: string[];
  code: string;
  children: Block[];
};
