import prisma from "../../../core/databases/prisma";
import type { ServiceTemplateInput } from "./ServiceDayService";

export interface CreateVariationInput {
  name: string;
  services: ServiceTemplateInput[];
}

export interface UpdateVariationInput {
  name?: string;
  services?: ServiceTemplateInput[];
}

const normalise = (s: ServiceTemplateInput) => ({
  order: s.order,
  serviceTime: s.serviceTime,
  preServiceTime: s.preServiceTime ?? null,
  closesAt: s.closesAt ?? null,
});

const include = {
  services: { orderBy: { order: "asc" as const } },
};

/**
 * Named presets under a ServiceDay (e.g. "Last Sunday — 1 service" on a
 * Sunday template that normally runs 2). Picked manually at session-start
 * time; no date-rule matching.
 */
export class ServiceDayVariationService {
  async list(serviceDayId: string) {
    const day = await prisma.serviceDay.findUnique({ where: { id: serviceDayId } });
    if (!day) throw new Error("ServiceDay not found");
    return prisma.serviceDayVariation.findMany({
      where: { serviceDayId },
      include,
      orderBy: { name: "asc" },
    });
  }

  async create(serviceDayId: string, input: CreateVariationInput) {
    const day = await prisma.serviceDay.findUnique({ where: { id: serviceDayId } });
    if (!day) throw new Error("ServiceDay not found");

    return prisma.serviceDayVariation.create({
      data: {
        serviceDayId,
        name: input.name,
        services: { create: input.services.map(normalise) },
      },
      include,
    });
  }

  async update(serviceDayId: string, variationId: string, input: UpdateVariationInput) {
    const existing = await prisma.serviceDayVariation.findUnique({
      where: { id: variationId },
    });
    if (!existing || existing.serviceDayId !== serviceDayId) {
      throw new Error("Variation not found");
    }

    return prisma.$transaction(async (tx) => {
      if (input.services && input.services.length > 0) {
        // Whole-set replacement — matches how ServiceDayService handles its
        // own services on update.
        await tx.serviceDayVariationService.deleteMany({
          where: { variationId },
        });
        await tx.serviceDayVariationService.createMany({
          data: input.services.map((s) => ({ ...normalise(s), variationId })),
        });
      }
      const data: { name?: string } = {};
      if (input.name !== undefined) data.name = input.name;
      return tx.serviceDayVariation.update({
        where: { id: variationId },
        data,
        include,
      });
    });
  }

  async remove(serviceDayId: string, variationId: string) {
    const existing = await prisma.serviceDayVariation.findUnique({
      where: { id: variationId },
    });
    if (!existing || existing.serviceDayId !== serviceDayId) {
      throw new Error("Variation not found");
    }
    await prisma.serviceDayVariation.delete({ where: { id: variationId } });
    return { success: true };
  }
}
