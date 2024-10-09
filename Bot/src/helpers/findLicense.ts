import LicenseModel from "../models/LicenseModel";
import { TLicenseModel } from "../typings/License";
import { decrypt } from "./crypto";

async function findLicense<T>(licensekey: string) {
  let license: TLicenseModel & T = null;

  const licenses = await LicenseModel.find();
  for (const licenseD of licenses) {
    const decryptedLicense = decrypt(licenseD.license);
    if (decryptedLicense === licensekey) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      license = licenseD as any;
      break;
    }
  }

  return license;
}

export default findLicense;
