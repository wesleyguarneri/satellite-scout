import { NamedValue } from "../named-value";

export type NodeApiResponse = {
  processed: boolean;
  status: string;
  timestamp: number;
  additionalAttributes: NamedValue[]
}