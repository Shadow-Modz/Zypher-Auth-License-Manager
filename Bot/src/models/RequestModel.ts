import { model, Schema } from "mongoose";
import Request from "../typings/Request";

const schema = new Schema<Request>(
  {
    date: {
      type: String,
      required: true,
    },
    rejected_requests: {
      type: Number,
      default: 0,
    },
    successful_requests: {
      type: Number,
      default: 0,
    },
    requests: {
      type: [],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<Request>("requests", schema);
