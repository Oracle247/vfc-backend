import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const schemaMatch = connectionString.match(/[?&]schema=([^&]+)/);
const schema = schemaMatch ? schemaMatch[1] : "public";

const pool = new Pool({
  connectionString,
  options: `-c search_path=${schema}`,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const departments = [
    {
      name: "Prayer Department",
      description: "Handles prayer activities and intercession",
    },
    {
      name: "Organizing Department",
      description: "Manages organizational activities and planning",
    },
    {
      name: "Media Department",
      description: "Manages media, communications, and content creation",
    },
    {
      name: "Music Department",
      description: "Coordinates music and choir activities",
    },
    {
      name: "Sound and Technical Department",
      description: "Manages sound systems and technical operations",
    },
    {
      name: "Drama Department",
      description: "Coordinates drama and theatrical presentations",
    },
    {
      name: "Sanctuary Department",
      description: "Maintains cleanliness and orderliness of the sanctuary",
    },
    {
      name: "Ushering Department",
      description: "Manages ushering and congregation coordination",
    },
    {
      name: "Evangelism and Outreach Department",
      description: "Coordinates evangelism and community outreach",
    },
    {
      name: "Hospitality Department",
      description: "Handles hospitality and guest reception",
    },
    {
      name: "Welfare Department",
      description: "Manages welfare and member support programs",
    },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }

  console.log(`Seeded ${departments.length} departments`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });