interface MRequest {
  date: string;
  rejected_requests: number;
  successful_requests: number;
  requests: IMRequest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IMRequest {
  ip: string;
  client: string;
  date: Date;
  rejected: boolean;
}

export default MRequest;
