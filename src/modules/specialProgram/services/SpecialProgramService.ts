import prisma from "../../../core/databases/prisma";

export interface ServiceTemplateInput {
  order: number;
  serviceTime: string;
  preServiceTime?: string | null;
  closesAt?: string | null;
}

export interface CreateSpecialProgramInput {
  name: string;
  date?: Date | null;
  services: ServiceTemplateInput[];
}

export interface UpdateSpecialProgramInput {
  name?: string;
  date?: Date | null;
  services?: ServiceTemplateInput[];
}

const normaliseTemplate = (s: ServiceTemplateInput) => ({
  order: s.order,
  serviceTime: s.serviceTime,
  preServiceTime: s.preServiceTime ?? null,
  closesAt: s.closesAt ?? null,
});

const include = {
  services: { orderBy: { order: "asc" as const } },
};

export class SpecialProgramService {
  async create(input: CreateSpecialProgramInput) {
    return prisma.specialProgram.create({
      data: {
        name: input.name,
        date: input.date ?? null,
        services: { create: input.services.map(normaliseTemplate) },
      },
      include,
    });
  }

  async list() {
    return prisma.specialProgram.findMany({
      include,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
  }

  async getById(id: string) {
    const row = await prisma.specialProgram.findUnique({ where: { id }, include });
    if (!row) throw new Error("SpecialProgram not found");
    return row;
  }

  async update(id: string, input: UpdateSpecialProgramInput) {
    return prisma.$transaction(async (tx) => {
      if (input.services && input.services.length > 0) {
        await tx.specialProgramService.deleteMany({ where: { specialProgramId: id } });
        await tx.specialProgramService.createMany({
          data: input.services.map((s) => ({ ...normaliseTemplate(s), specialProgramId: id })),
        });
      }
      const data: { name?: string; date?: Date | null } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.date !== undefined) data.date = input.date;
      return tx.specialProgram.update({ where: { id }, data, include });
    });
  }

  async remove(id: string) {
    return prisma.specialProgram.delete({ where: { id } });
  }
}
