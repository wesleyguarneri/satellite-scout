import { NamedValue } from "../named-value";

export interface NodeObj {
  category: string;
  type: string;
  name: string;
  identifiers: NamedValue[];
  imageB64: string;
  physicalProperties: NamedValue[];
  sensors: NamedValue[];
  description: string;
  additionalAttributes: NamedValue[];
  id: string;
}