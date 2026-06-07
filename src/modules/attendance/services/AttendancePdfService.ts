import { Response } from "express";
import prisma from "../../../core/databases/prisma";
import {
  AttendanceFilterParams,
  applyPostFetchFilters,
  buildAttendanceWhere,
} from "../utils/attendanceFilters";
import { buildSessionReportDocDefinition } from "../pdf/sessionReport";

// pdfmake v0.3 ships as a singleton with no bundled types in this version.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfmake = require("pdfmake");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const robotoFonts = require("pdfmake/fonts/Roboto");
pdfmake.setFonts(robotoFonts);

const sanitizeFilename = (s: string) =>
  s.replace(/[^a-z0-9_\-]+/gi, "_").replace(/^_+|_+$/g, "") || "session";

export class AttendancePdfService {
  /**
   * Generate the session attendance PDF and stream it to `res`.
   * Throws when the session is missing; the route's `next(err)` will surface a 4xx/5xx.
   */
  async streamSessionReport(
    sessionId: string,
    filters: AttendanceFilterParams,
    requestingUserId: string,
    res: Response
  ): Promise<void> {
    const [session, settings, generatedBy] = await Promise.all([
      prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          services: { orderBy: { order: "asc" } },
          attendees: {
            where: buildAttendanceWhere(filters),
            include: { user: { include: { departments: true } } },
          },
        },
      }),
      prisma.churchSettings.findUnique({ where: { id: "singleton" } }),
      prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!session) throw new Error("Attendance session not found");

    const services = session.services.map((s) => ({
      order: s.order,
      serviceTime: s.serviceTime,
      preServiceTime: s.preServiceTime,
      closesAt: s.closesAt,
    }));

    const filteredAttendees = applyPostFetchFilters(session.attendees, filters, services);

    const docDefinition = buildSessionReportDocDefinition({
      churchName: settings?.name ?? "My Church",
      churchAddress: settings?.address ?? null,
      sessionName: session.serviceName,
      sessionDate: session.date,
      services,
      generatedByName: generatedBy
        ? `${generatedBy.firstName} ${generatedBy.lastName}`.trim()
        : "Unknown",
      generatedAt: new Date(),
      attendees: filteredAttendees,
    });

    const firstServiceTime = services[0]?.serviceTime ?? session.startedAt;
    const dateLabel = (session.date ?? firstServiceTime).toISOString().slice(0, 10);
    const filename = `${sanitizeFilename(session.serviceName)}_${dateLabel}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const pdfDoc = pdfmake.createPdf(docDefinition);
    const stream = await pdfDoc.getStream();
    stream.pipe(res);
    stream.end();
  }
}
