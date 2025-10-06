export interface NodeOperationalHistory {
  nodeId: string;
  timestamp: number;
  geoLocation: {
    latitude: number;
    longitude: number
  };
  event: string;
  description: string;
  initiator: string;
  additionalInformation: [
    {
      name: string;
      value: string
    }
  ]
}