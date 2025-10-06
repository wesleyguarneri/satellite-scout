import { NamedValue } from "../named-value";

export interface NodeStatus {
  nodeId: string;
  updatedTimestamp: number;
  geoLocation: {
    latitude: number;
    longitude: number
  };
  description: string;
  status?: string;
  sensorStatus?: NamedValue[];
  additionalStatusInformation?: NamedValue[];
}

