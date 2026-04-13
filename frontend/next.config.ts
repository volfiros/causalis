import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const rootEnvPath = path.resolve(process.cwd(), "..", ".env");

if (fs.existsSync(rootEnvPath)) {
  const envFile = fs.readFileSync(rootEnvPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const nextConfig: NextConfig = {
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
};

export default nextConfig;
