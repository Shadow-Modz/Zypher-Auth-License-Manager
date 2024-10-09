import { model, Schema } from "mongoose";

interface Role {
  roleId: number;
  name: string;
  permissions: string[];
}

const schema = new Schema<Role>(
  {
    roleId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<Role>("roles", schema);
