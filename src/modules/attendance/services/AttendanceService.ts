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
}
