import { Config } from "../typings/Config";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import crypto from "crypto";

const config = load(readFileSync("config/config.yml", "utf-8")) as Config;

const algorithm = "aes-256-ctr";
const secretKey = crypto
  .createHash("sha256")
  .update(config.LicenseSettings.SecretKey)
  .digest("base64")
  .substring(0, 32);

const encrypt = (license: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(license), cipher.final()]);
  const final = iv.toString("hex") + "**Bloom**" + encrypted.toString("hex");
  return Buffer.from(final).toString("base64");
};

const decrypt = (hash: string) => {
  if (!hash) return "";

  try {
    const fromBuffer = Buffer.from(hash, "base64").toString("ascii");
    const [iv, content] = fromBuffer.split("**Bloom**");
    const decipher = crypto.createDecipheriv(
      algorithm,
      secretKey,
      Buffer.from(iv, "hex")
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(content, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString();
  } catch (error) {
    // Handle decryption error
    console.error("Decryption error:", error);
    return "";
  }
};

export { encrypt, decrypt };
