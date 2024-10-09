import { model, Schema } from "mongoose";
import License from "../typings/License";

const schema = new Schema<License>(
  {
    product_name: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: null,
    },
    license: {
      type: String,
      required: true,
    },
    discord_id: {
      type: String,
      required: true,
    },
    ip_list: {
      type: ["string"],
      required: true,
    },
    ip_cap: {
      type: Number,
      default: 3,
      required: true,
    },
    latest_ip: {
      type: String,
      default: null,
    },
    hwid_list: {
      type: ["string"],
      required: true,
    },
    hwid_cap: {
      type: Number,
      default: 3,
      required: true,
    },
    latest_hwid: {
      type: String,
      default: null,
    },
    total_requests: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      required: true,
    },
    expires_date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<License>("licenses", schema);
