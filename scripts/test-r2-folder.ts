import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const {
    ensureClientImageFolder,
    hasCloudflareR2ServerConfig,
    r2PublicBaseUrl
  } = await import("../src/lib/storage/cloudflare-r2");

  console.log("configured:", hasCloudflareR2ServerConfig());
  console.log("public:", r2PublicBaseUrl());
  const result = await ensureClientImageFolder("r2-setup-test");
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
