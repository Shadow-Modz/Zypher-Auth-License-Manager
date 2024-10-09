import { Document } from "mongoose";

interface Role {
  roleId: number;
  name: string;
  permissions: string[];
}

export type TRoleModel = Document<Role> & Role;
export default Role;
