import { model, Schema } from "mongoose";
import Product from "../typings/Product";

const schema = new Schema<Product>(
  {
    name: {
      type: String,
      required: true,
      maxlength: [32, "Name must have a maximum of 32 characters"],
      minlength: [3, "Name must have a minimum of 3 characters"],
      unique: true,
    },
    description: {
      type: String,
      required: false,
      default: "Without description",
    },
    price: {
      type: Number,
      required: true,
    },
    version: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    role: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: String,
      default: "Developer API",
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<Product>("products", schema);
