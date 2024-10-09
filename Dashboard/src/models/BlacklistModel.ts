import { model, Schema } from "mongoose";
import Blacklist from "../typings/Blacklist";

const schema = new Schema<Blacklist>(
  {
    blacklisted: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["ip", "hwid"],
      required: true,
    },
    blocked_connections: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<Blacklist>("blacklists", schema);
