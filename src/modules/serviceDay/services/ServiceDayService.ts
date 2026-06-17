import { Weekday } from "@prisma/client";
import prisma from "../../../core/databases/prisma";

export interface ServiceTemplateInput {
  order: number;
  serviceTime: string;
  preServiceTime?: string | null;
  closesAt?: string | null;
}

export interface CreateServiceDayInput {
  name: string;
  weekday: Weekday;
  services: ServiceTemplateInput[];
}

export interface UpdateServiceDayInput {
  name?: string;
  weekday?: Weekday;
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

export class ServiceDayService {
  async create(input: CreateServiceDayInput) {
    return prisma.serviceDay.create({
      data: {
        name: input.name,
        weekday: input.weekday,
        services: { create: input.services.map(normaliseTemplate) },
      },
      include,
    });
  }

  async list() {
    return prisma.serviceDay.findMany({
      include,
      orderBy: [{ weekday: "asc" }, { createdAt: "asc" }],
    });
  }

  async getById(id: string) {
    const row = await prisma.serviceDay.findUnique({ where: { id }, include });
    if (!row) throw new Error("ServiceDay not found");
    return row;
  }

  async update(id: string, input: UpdateServiceDayInput) {
    return prisma.$transaction(async (tx) => {
      if (input.services && input.services.length > 0) {
        await tx.serviceDayService.deleteMany({ where: { serviceDayId: id } });
        await tx.serviceDayService.createMany({
          data: input.services.map((s) => ({ ...normaliseTemplate(s), serviceDayId: id })),
        });
      }
      const data: { name?: string; weekday?: Weekday } = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.weekday !== undefined) data.weekday = input.weekday;
      return tx.serviceDay.update({ where: { id }, data, include });
    });
  }

  async remove(id: string) {
    return prisma.serviceDay.delete({ where: { id } });
  }
}
