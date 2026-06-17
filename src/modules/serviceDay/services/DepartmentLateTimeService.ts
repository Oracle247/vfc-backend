import { UserRole } from "@prisma/client";
import prisma from "../../../core/databases/prisma";

export interface UpsertLateTimeInput {
  lateTime: string; // "HH:mm"
}

/**
 * Per-(ServiceDay × Department) late cutoff used by attendance reports to
 * decide who counts as late *within* a department. Falls back to the
 * session-wide cutoff in the report when no row exists for a department.
 */
export class DepartmentLateTimeService {
  /** All overrides for a service day, with the department joined. */
  async listForServiceDay(serviceDayId: string) {
    const day = await prisma.serviceDay.findUnique({ where: { id: serviceDayId } });
    if (!day) throw new Error("ServiceDay not found");

    return prisma.serviceDayDepartmentLateTime.findMany({
      where: { serviceDayId },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { department: { name: "asc" } },
    });
  }

  /**
   * Caller may set/clear an override only if they're ADMIN, head of the
   * department, or one of its assistant heads. Returns the resolved row.
   */
  async assertCanEdit(
    serviceDayId: string,
    departmentId: string,
    actor: { id: string; role: UserRole },
  ) {
    if (actor.role === UserRole.ADMIN) return;

    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        headId: true,
        assistantHeads: { select: { id: true } },
      },
    });
    if (!dept) throw new Error("Department not found");

    const isHead = dept.headId === actor.id;
    const isAssistant = dept.assistantHeads.some((u) => u.id === actor.id);
    if (!isHead && !isAssistant) {
      throw new Error("Forbidden: not a head or assistant of this department");
    }

    // Make sure the service day exists too — surfaces a clean 4xx rather than
    // a Prisma FK error if either parent is missing.
    const day = await prisma.serviceDay.findUnique({ where: { id: serviceDayId } });
    if (!day) throw new Error("ServiceDay not found");
  }

  async upsert(
    serviceDayId: string,
    departmentId: string,
    input: UpsertLateTimeInput,
    actor: { id: string; role: UserRole },
  ) {
    await this.assertCanEdit(serviceDayId, departmentId, actor);

    return prisma.serviceDayDepartmentLateTime.upsert({
      where: {
        serviceDayId_departmentId: { serviceDayId, departmentId },
      },
      create: {
        serviceDayId,
        departmentId,
        lateTime: input.lateTime,
        updatedById: actor.id,
      },
      update: {
        lateTime: input.lateTime,
        updatedById: actor.id,
      },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async remove(
    serviceDayId: string,
    departmentId: string,
    actor: { id: string; role: UserRole },
  ) {
    await this.assertCanEdit(serviceDayId, departmentId, actor);
    await prisma.serviceDayDepartmentLateTime.deleteMany({
      where: { serviceDayId, departmentId },
    });
    return { success: true };
  }
}
