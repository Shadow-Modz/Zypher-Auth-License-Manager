interface Request {
  date: string;
  rejected_requests: number;
  successful_requests: number;
  requests: IRequest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRequest {
  ip: string;
  client: string;
  date: Date;
  rejected: boolean;
}

export default Request;
