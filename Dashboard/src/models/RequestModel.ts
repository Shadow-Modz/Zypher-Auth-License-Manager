import { model, Schema } from "mongoose";
import MRequest from "../typings/MRequest";

const schema = new Schema<MRequest>(
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

export default model<MRequest>("requests", schema);
