import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: path.join(__dirname, ".env") });

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
});
