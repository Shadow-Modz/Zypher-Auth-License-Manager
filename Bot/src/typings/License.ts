import { Document } from "mongoose";

interface License {
  product_name: string;
  reason: string | null;
  license: string;
  discord_id: string;
  ip_list: string[];
  ip_cap: number;
  latest_ip: string;
  hwid_list: string[];
  hwid_cap: number;
  latest_hwid: string;
  total_requests: number;
  expires_date: Date;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TLicenseModel = Document<License> & License;
export default License;
