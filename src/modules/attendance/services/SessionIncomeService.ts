import { IncomeCategory, PaymentMethod, Prisma } from "@prisma/client";
import prisma from "../../../core/databases/prisma";

export interface IncomeEntryInput {
  category: IncomeCategory;
  method: PaymentMethod;
  amount: number;
}

export interface PerServiceIncomeInput {
  serviceOrder: number;
  entries: IncomeEntryInput[];
}

export interface UpsertIncomeInput {
  services: PerServiceIncomeInput[];
}

const include = {
  services: {
    orderBy: { order: "asc" as const },
    include: { incomes: true },
  },
} satisfies Prisma.AttendanceSessionInclude;

const toDecimalString = (amount: number) =>
  // Prisma's Decimal accepts a string; we trim to 2 dp so storage matches the
  // schema's @db.Decimal(12, 2) precision and avoids float noise.
  amount.toFixed(2);

export class SessionIncomeService {
  /**
   * Returns the session with its services + recorded incomes attached, so the
   * client can build the income matrix.
   */
  async getForSession(sessionId: string) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include,
    });
    if (!session) throw new Error("Attendance session not found");
    return session;
  }

  /**
   * Replace-by-(service, category, method): for each provided entry, upsert.
   * Entries omitted from the payload are left untouched; pass amount=0 to
   * effectively clear a cell. The whole save runs in a transaction.
   */
  async upsertForSession(
    sessionId: string,
    data: UpsertIncomeInput,
    recordedById?: string | null,
  ) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { services: true },
    });
    if (!session) throw new Error("Attendance session not found");

    const serviceByOrder = new Map(session.services.map((s) => [s.order, s.id]));

    await prisma.$transaction(async (tx) => {
      for (const svc of data.services) {
        const sessionServiceId = serviceByOrder.get(svc.serviceOrder);
        if (!sessionServiceId) {
          throw new Error(`Service order ${svc.serviceOrder} not found on session`);
        }
        for (const entry of svc.entries) {
          await tx.sessionIncome.upsert({
            where: {
              sessionServiceId_category_method: {
                sessionServiceId,
                category: entry.category,
                method: entry.method,
              },
            },
            create: {
              sessionServiceId,
              category: entry.category,
              method: entry.method,
              amount: toDecimalString(entry.amount),
              recordedById: recordedById ?? null,
            },
            update: {
              amount: toDecimalString(entry.amount),
              recordedById: recordedById ?? null,
            },
          });
        }
      }
    });

    return this.getForSession(sessionId);
  }

  async closeSession(sessionId: string) {
    return prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
      include,
    });
  }

  async reopenSession(sessionId: string) {
    return prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { endedAt: null },
      include,
    });
  }
}
