import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, "..", ".env.local");
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
let apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
let databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === "CLOUDFLARE_ACCOUNT_ID") accountId = val;
      if (key === "CLOUDFLARE_API_TOKEN") apiToken = val;
      if (key === "CLOUDFLARE_D1_DATABASE_ID") databaseId = val;
    }
  }
}

async function queryD1(sql) {
  if (!accountId || !databaseId || !apiToken) {
    console.error("Missing Cloudflare D1 credentials in .env.local");
    return [];
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "D1 error");
  }
  return data.result;
}

async function clearAllDatabase() {
  console.log("=================================================");
  console.log("  🧹 TOTAL WIPE: CLEARING ALL ACCOUNTS & DATA");
  console.log("=================================================\n");

  const tables = [
    "watched_items",
    "wishlist_items",
    "folder_items",
    "folders",
    "friend_requests",
    "friendships",
    "notifications",
    "users",
  ];

  for (const table of tables) {
    try {
      await queryD1(`DELETE FROM ${table};`);
      console.log(`✓ Completely purged table: ${table}`);
    } catch (e) {
      console.log(`- Note for ${table}: ${e.message}`);
    }
  }

  console.log("\n✨ Cloudflare D1 is completely wiped (all accounts and data cleared).");
}

clearAllDatabase();
