import fs from "fs";
import yaml from "js-yaml";

export function getDownloadConfig() {
  const file = fs.readFileSync("./config/download.yml", "utf8");
  return yaml.load(file) as any; // Adjust typing as necessary
}

export function updateYAML(section: string, data: any) {
  const config = getDownloadConfig();
  if (section in config) {
    config[section] = data;
    fs.writeFileSync("./config/download.yml", yaml.dump(config));
  }
}
