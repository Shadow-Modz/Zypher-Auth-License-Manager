import RequestModel from "../models/RequestModel";
import License from "../typings/License";
import { IMRequest } from "../typings/MRequest";

interface FunctionProps {
  requestType: "success" | "failed";
  ipAddress: string;
  license?: License;
}

const handleRequest = async ({
  requestType,
  ipAddress,
  license,
}: FunctionProps) => {
  const date = new Date().toLocaleDateString("en-US");
  const request = await RequestModel.findOne({ date });

  const requestAction =
    requestType === "failed" ? "rejected_requests" : "successful_requests";

  const requestObject: IMRequest = {
    ip: ipAddress,
    client: license?.discord_id || null,
    date: new Date(),
    rejected: requestType === "failed",
  };

  if (request) {
    request[requestAction]++;
    request.requests.push(requestObject);
    return await request.save();
  }

  return await RequestModel.create({
    date,
    requests: [requestObject],
    [requestAction]: 1,
  });
};

export default handleRequest;
