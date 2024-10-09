import RoleModel from "../models/RoleModel";
import { TRoleModel } from "../typings/Role";

async function findRole<T>(rolekey: string) {
  let role: TRoleModel & T = null;

  const roles = await RoleModel.find();
  for (const roleD of roles) {
    role = roleD as any;
    break;
  }

  return role;
}

export default findRole;
