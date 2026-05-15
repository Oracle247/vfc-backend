import { Prisma } from "@prisma/client";
import prisma from "../../../core/databases/prisma";
import { paginate } from "../../../core/utils/paginate";

type AttendanceSession = Prisma.AttendanceSessionGetPayload<{
  include: {
    attendees: {
      include: { user: true };
    };
  };
}>;

export class AttendanceService {

  async startSession(serviceName: string, startedAt: Date): Promise<AttendanceSession> {
    // Prevent duplicate sessions for same startedAt + service
    const existing = await prisma.attendanceSession.findFirst({
      where: { startedAt, serviceName },
    });
    if (existing) throw new Error("Session already exists for this date and service");

    return await prisma.attendanceSession.create({
      data: {
        serviceName,
        startedAt,
      },
      include: {
        attendees: { include: { user: true } },
      },
    });
  }

  async markAttendance(sessionId: string, userId: string) {
    // Ensure session exists
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error("Attendance session not found");

    // Check if already marked
    const alreadyMarked = await prisma.attendance.findFirst({
      where: { sessionId, userId },
    });
    if (alreadyMarked) throw new Error("User already marked present");

    await prisma.attendance.create({
      data: { sessionId, userId },
      include: { user: true },
    });

    return { success: true };
  }

  async getAllSessions(page = 1, limit = 10) {
    return await paginate(prisma.attendanceSession, {
      page,
      limit,
      include: {
        attendees: { include: { user: true } },
      },
      orderBy: { date: "desc" },
    });
  }

  async getSessionById(sessionId: string): Promise<AttendanceSession | null> {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        attendees: { include: { user: true } },
      },
    });

    if (!session) throw new Error("Attendance session not found");

    return session;
  }

  async updateSession(sessionId: string, data: Partial<{ serviceName: string; date: Date }>) {
    return await prisma.attendanceSession.update({
      where: { id: sessionId },
      data,
      include: { attendees: { include: { user: true } } },
    });
  }

  async bulkMarkAttendance(sessionId: string, userIds: string[]) {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new Error("Attendance session not found");

    const existing = await prisma.attendance.findMany({
      where: { sessionId, userId: { in: userIds } },
      select: { userId: true },
    });
    const alreadyMarkedIds = new Set(existing.map(a => a.userId));

    const toMark = userIds.filter(id => !alreadyMarkedIds.has(id));

    if (toMark.length > 0) {
      await prisma.attendance.createMany({
        data: toMark.map(userId => ({ sessionId, userId })),
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
