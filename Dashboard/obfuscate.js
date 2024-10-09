const glob = require("glob");
const { execSync } = require("child_process");
const fs = require("fs");

const files = glob.sync("dist/**/*.js");
files.forEach((file) => {
  const obfuscatedCode = execSync(`uglifyjs ${file} -c -m`).toString();
  fs.writeFileSync(file, obfuscatedCode);
});
