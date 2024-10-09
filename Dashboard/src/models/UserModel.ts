import { model, Schema } from "mongoose";

interface User {
  discordId: string;
  createdAt?: string;
  updatedAt?: string;
  role: string;
}

const schema = new Schema<User>(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      default: "user",
    },
  },
  { timestamps: true, versionKey: false }
);

export default model<User>("users", schema);
