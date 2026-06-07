import { Prisma } from "@prisma/client";
import prisma from "../../../core/databases/prisma";
import { paginate } from "../../../core/utils/paginate";
import {
  AttendanceFilterParams,
  applyPostFetchFilters,
  buildAttendanceWhere,
  inferServiceOrder,
  SessionServiceLite,
} from "../utils/attendanceFilters";

export interface ServiceInput {
  order: number;
  serviceTime: Date;
  preServiceTime?: Date | null;
  closesAt?: Date | null;
}

export interface StartSessionInput {
  serviceName: string;
  startedAt: Date;
  date?: Date;
  services: ServiceInput[];
}

export interface UpdateSessionInput {
  serviceName?: string;
  startedAt?: Date;
  date?: Date;
  services?: ServiceInput[];
}

// Helper: a session loaded with the relations every caller needs.
const sessionInclude = {
  services: { orderBy: { order: "asc" as const } },
  attendees: {
    include: { user: { include: { departments: true } } },
  },
} satisfies Prisma.AttendanceSessionInclude;

const normaliseService = (s: ServiceInput) => ({
  order: s.order,
  serviceTime: s.serviceTime,
  preServiceTime: s.preServiceTime ?? null,
  closesAt: s.closesAt ?? null,
});

const toLite = (s: { order: number; serviceTime: Date; preServiceTime: Date | null; closesAt: Date | null }): SessionServiceLite => ({
  order: s.order,
  serviceTime: s.serviceTime,
  preServiceTime: s.preServiceTime,
  closesAt: s.closesAt,
});

export class AttendanceService {

  async startSession(input: StartSessionInput) {
    const { serviceName, startedAt, date, services } = input;

    // Prevent duplicate sessions for same startedAt + service
    const existing = await prisma.attendanceSession.findFirst({
      where: { startedAt, serviceName },
    });
    if (existing) throw new Error("Session already exists for this date and service");

    return await prisma.attendanceSession.create({
      data: {
        serviceName,
        startedAt,
        date: date ?? null,
        services: {
          create: services.map(normaliseService),
        },
      },
      include: sessionInclude,
    });
  }

  async markAttendance(
    sessionId: string,
    userId: string,
    markedAt?: Date,
    serviceOrderOverride?: number,
  ) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { services: { orderBy: { order: "asc" } } },
    });
    if (!session) throw new Error("Attendance session not found");

    // Check if already marked
    const alreadyMarked = await prisma.attendance.findFirst({
      where: { sessionId, userId },
    });
    if (alreadyMarked) throw new Error("User already marked present");

    const effectiveMarkedAt = markedAt ?? new Date();
    const orders = new Set(session.services.map((s) => s.order));
    const serviceOrder =
      serviceOrderOverride && orders.has(serviceOrderOverride)
        ? serviceOrderOverride
        : inferServiceOrder(effectiveMarkedAt, session.services.map(toLite));

    await prisma.attendance.create({
      data: { sessionId, userId, markedAt: effectiveMarkedAt, serviceOrder },
      include: { user: true },
    });

    return { success: true, serviceOrder };
  }

  async getAllSessions(page = 1, limit = 10) {
    return await paginate(prisma.attendanceSession, {
      page,
      limit,
      include: {
        services: { orderBy: { order: "asc" } },
        attendees: { include: { user: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async getSessionById(sessionId: string, filters: AttendanceFilterParams = {}) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        services: { orderBy: { order: "asc" } },
        attendees: {
          where: buildAttendanceWhere(filters),
          include: {
            user: { include: { departments: true } },
          },
        },
      },
    });

    if (!session) throw new Error("Attendance session not found");

    const filteredAttendees = applyPostFetchFilters(
      session.attendees,
      filters,
      session.services.map(toLite),
    );

    return { ...session, attendees: filteredAttendees };
  }

  async updateSession(sessionId: string, data: UpdateSessionInput) {
    const { services, ...rest } = data;
    // When a services array is provided, replace the whole set.
    return await prisma.$transaction(async (tx) => {
      if (services && services.length > 0) {
        await tx.sessionService.deleteMany({ where: { sessionId } });
        await tx.sessionService.createMany({
          data: services.map((s) => ({ ...normaliseService(s), sessionId })),
        });
      }
      return tx.attendanceSession.update({
        where: { id: sessionId },
        data: rest,
        include: sessionInclude,
      });
    });
  }

  async bulkMarkAttendance(sessionId: string, userIds: string[]) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { services: { orderBy: { order: "asc" } } },
    });
    if (!session) throw new Error("Attendance session not found");

    const existing = await prisma.attendance.findMany({
      where: { sessionId, userId: { in: userIds } },
      select: { userId: true },
    });
    const alreadyMarkedIds = new Set(existing.map(a => a.userId));

    const toMark = userIds.filter(id => !alreadyMarkedIds.has(id));

    if (toMark.length > 0) {
      const now = new Date();
      const serviceOrder = inferServiceOrder(now, session.services.map(toLite));
      await prisma.attendance.createMany({
        data: toMark.map(userId => ({ sessionId, userId, markedAt: now, serviceOrder })),
      });
    }

    return {
      marked: toMark.length,
      alreadyPresent: alreadyMarkedIds.size,
    };
  }

  async deleteSession(sessionId: string) {
    return await prisma.attendanceSession.delete({
      where: { id: sessionId },
    });
  }

  async updateAttendance(
    attendanceId: string,
    data: { markedAt?: Date; serviceOrder?: number },
  ) {
    if (data.serviceOrder !== undefined) {
      // Make sure the requested serviceOrder actually exists on the parent session.
      const row = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        select: {
          sessionId: true,
          session: { select: { services: { select: { order: true } } } },
        },
      });
      if (!row) throw new Error("Attendance not found");
      const valid = row.session.services.some((s) => s.order === data.serviceOrder);
      if (!valid) {
        throw new Error(
          `Service order ${data.serviceOrder} does not exist on this session`,
        );
      }
    }

    return await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        ...(data.markedAt !== undefined ? { markedAt: data.markedAt } : {}),
        ...(data.serviceOrder !== undefined ? { serviceOrder: data.serviceOrder } : {}),
      },
      include: { user: { include: { departments: true } } },
    });
  }

  async deleteAttendance(attendanceId: string) {
    return await prisma.attendance.delete({
      where: { id: attendanceId },
    });
  }

  async getAttendanceSummary() {
    const [totalSessions, totalAttendanceRecords, uniqueAttendees] = await Promise.all([
      prisma.attendanceSession.count(),
      prisma.attendance.count(),
      prisma.attendance.groupBy({ by: ['userId'] }).then(r => r.length),
    ]);

    const avgAttendancePerSession = totalSessions > 0
      ? Math.round(totalAttendanceRecords / totalSessions)
      : 0;

    return { totalSessions, uniqueAttendees, avgAttendancePerSession };
  }

  async getTopMembers(limit = 10) {
    const grouped = await prisma.attendance.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map(g => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true, churchStatus: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return grouped.map(g => ({
      ...userMap.get(g.userId),
      attendanceCount: g._count.userId,
    }));
  }

  async getMemberAttendanceHistory(userId: string) {
    return await prisma.attendance.findMany({
      where: { userId },
      include: {
        session: { select: { id: true, serviceName: true, startedAt: true } },
      },
      orderBy: { markedAt: 'asc' },
    });
  }

  async getAttendanceTrend(groupBy: 'session' | 'week' | 'month' = 'session') {
    if (groupBy === 'session') {
      const sessions = await prisma.attendanceSession.findMany({
        include: { _count: { select: { attendees: true } } },
        orderBy: { startedAt: 'asc' },
      });

      return sessions.map(s => ({
        period: s.startedAt.toISOString(),
        label: s.serviceName,
        count: s._count.attendees,
      }));
    }

    const interval = groupBy === 'week' ? 'week' : 'month';
    const results: { period: Date; count: bigint }[] = await prisma.$queryRawUnsafe(
      `SELECT date_trunc('${interval}', "markedAt") as period, COUNT(*)::bigint as count FROM "Attendance" GROUP BY period ORDER BY period`
    );

    return results.map(r => ({
      period: new Date(r.period).toISOString(),
      label: interval,
      count: Number(r.count),
    }));
  }

  async getAttendanceRate() {
    const [totalMembers, sessions] = await Promise.all([
      prisma.user.count(),
      prisma.attendanceSession.findMany({
        include: { _count: { select: { attendees: true } } },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    return sessions.map(s => ({
      sessionId: s.id,
      serviceName: s.serviceName,
      date: s.startedAt.toISOString(),
      attendeeCount: s._count.attendees,
      totalMembers,
      rate: totalMembers > 0 ? Math.round((s._count.attendees / totalMembers) * 100) : 0,
    }));
  }
}
