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
  /**
   * Start a new attendance session (e.g., "Sunday Service")
   */
  async startSession(serviceName: string, date: Date): Promise<AttendanceSession> {
    // Prevent duplicate sessions for same date + service
    const existing = await prisma.attendanceSession.findFirst({
      where: { date, serviceName },
    });
    if (existing) throw new Error("Session already exists for this date and service");

    return await prisma.attendanceSession.create({
      data: {
        serviceName,
        date,
      },
      include: {
        attendees: { include: { user: true } },
      },
    });
  }

  /**
   * Mark a user's attendance for a session
   */
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

    return await prisma.attendance.create({
      data: { sessionId, userId },
      include: { user: true },
    });
  }

  /**
   * Get all attendance sessions (with pagination)
   */
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

  /**
   * Get session details (with attendees)
   */
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

  /**
   * Update session details (e.g., service name, date)
   */
  async updateSession(sessionId: string, data: Partial<{ serviceName: string; date: Date }>) {
    return await prisma.attendanceSession.update({
      where: { id: sessionId },
      data,
      include: { attendees: { include: { user: true } } },
    });
  }

  /**
   * Delete a session (removes attendance records too)
   */
  async deleteSession(sessionId: string) {
    return await prisma.attendanceSession.delete({
      where: { id: sessionId },
    });
  }
}
