import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  webpack(config, { webpack }) {
    if (process.env.NETLIFY) {
      const netlifyDb = path.join(projectRoot, "db/netlify.ts");
      const netlifySchema = path.join(projectRoot, "db/netlify-schema.ts");
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/db$": netlifyDb,
        "@/db/schema$": netlifySchema,
        "@/db/schema": netlifySchema,
        "@/db": netlifyDb,
        [path.join(projectRoot, "db/schema.ts")]: netlifySchema,
        [path.join(projectRoot, "db/index.ts")]: netlifyDb,
      };
      // Next may resolve tsconfig path aliases before applying resolve.alias.
      // Replacing both request forms keeps Cloudflare-only modules out of the
      // Netlify server bundle while preserving the D1 adapter for local/Sites.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^@\/db(?:\/index)?$/,
          netlifyDb,
        ),
        new webpack.NormalModuleReplacementPlugin(
          /^@\/db\/schema$/,
          netlifySchema,
        ),
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]db[\\/]index\.ts$/,
          netlifyDb,
        ),
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]db[\\/]schema\.ts$/,
          netlifySchema,
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
