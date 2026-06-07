import { ChurchStatus, Gender, MembershipType } from "@prisma/client";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import {
  isLateAttendance,
  AttendeeWithUser,
  SessionServiceLite,
} from "../utils/attendanceFilters";

export interface SessionReportInput {
  churchName: string;
  churchAddress?: string | null;
  sessionName: string;
  sessionDate: Date | null;
  services: SessionServiceLite[]; // sorted by order ASC
  generatedByName: string;
  generatedAt: Date;
  attendees: AttendeeWithUser[];
}

interface DepartmentStat {
  total: number;
  male: number;
  female: number;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const formatDateTime = (d: Date) => `${formatDate(d)} ${formatTime(d)}`;

const fullName = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`.trim();

const departmentNames = (user: AttendeeWithUser["user"]) =>
  user.departments?.map((d) => d.name).join(", ") || "—";

const minutesLate = (markedAt: Date, cutoff: Date) =>
  Math.max(0, Math.round((markedAt.getTime() - cutoff.getTime()) / 60000));

const cutoffFor = (
  membershipType: MembershipType | null,
  service: SessionServiceLite,
) =>
  membershipType === MembershipType.WORKER && service.preServiceTime
    ? service.preServiceTime
    : service.serviceTime;

const serviceLabel = (order: number) => `S${order}`;

/**
 * Build the pdfmake `TDocumentDefinitions` for a session attendance report.
 * Pure function — no I/O, no Prisma calls — so it can be snapshot-tested.
 */
export function buildSessionReportDocDefinition(input: SessionReportInput): TDocumentDefinitions {
  const {
    churchName,
    churchAddress,
    sessionName,
    sessionDate,
    services,
    generatedByName,
    generatedAt,
    attendees,
  } = input;

  // Index services by order. Fall back to the first service for any malformed
  // attendance row (defensive — shouldn't happen, but keeps the PDF building
  // instead of throwing).
  const sortedServices = [...services].sort((a, b) => a.order - b.order);
  const serviceByOrder = new Map<number, SessionServiceLite>(
    sortedServices.map((s) => [s.order, s]),
  );
  const fallbackService = sortedServices[0];

  const serviceFor = (attendee: AttendeeWithUser): SessionServiceLite =>
    serviceByOrder.get(attendee.serviceOrder) ?? fallbackService;

  const isLate = (attendee: AttendeeWithUser) =>
    isLateAttendance(
      attendee.markedAt,
      attendee.user.membershipType,
      serviceFor(attendee),
    );

  const isMulti = sortedServices.length > 1;

  // Analytics
  const total = attendees.length;
  const male = attendees.filter((a) => a.user.gender === Gender.MALE).length;
  const female = attendees.filter((a) => a.user.gender === Gender.FEMALE).length;
  const workers = attendees.filter((a) => a.user.membershipType === MembershipType.WORKER);
  const nonWorkers = attendees.filter(
    (a) => a.user.membershipType === MembershipType.NON_WORKER,
  );
  const firstTimers = attendees.filter((a) => a.user.churchStatus === ChurchStatus.FIRST_TIMER);
  const visitors = attendees.filter((a) => a.user.churchStatus === ChurchStatus.VISITOR);
  const level100Students = attendees.filter((a) => a.user.level === "100");
  const lateAttendees = attendees.filter(isLate);
  const lateWorkers = lateAttendees.filter(
    (a) => a.user.membershipType === MembershipType.WORKER,
  );

  // Department breakdown
  const deptStats = new Map<string, DepartmentStat>();
  for (const a of attendees) {
    for (const dept of a.user.departments ?? []) {
      const stat = deptStats.get(dept.name) ?? { total: 0, male: 0, female: 0 };
      stat.total += 1;
      if (a.user.gender === Gender.MALE) stat.male += 1;
      if (a.user.gender === Gender.FEMALE) stat.female += 1;
      deptStats.set(dept.name, stat);
    }
  }
  const deptRows = Array.from(deptStats.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => [name, String(s.male), String(s.female), String(s.total)]);

  // Summary rows
  const summaryRows: [string, string][] = [
    ["Total Attendance", String(total)],
    ["Male", String(male)],
    ["Female", String(female)],
    ["Workers", String(workers.length)],
    ["Non-workers", String(nonWorkers.length)],
    ["First Timers", String(firstTimers.length)],
    ["Visitors", String(visitors.length)],
    ["100 Level Students", String(level100Students.length)],
    ["Late Comers", String(lateAttendees.length)],
    ["Late Worker Comers", String(lateWorkers.length)],
  ];

  // Per-service summary
  const perServiceRows = sortedServices.map((s) => {
    const inService = attendees.filter((a) => a.serviceOrder === s.order);
    const lateInService = inService.filter(isLate).length;
    return [
      serviceLabel(s.order),
      formatTime(s.serviceTime),
      s.preServiceTime ? formatTime(s.preServiceTime) : "—",
      s.closesAt ? formatTime(s.closesAt) : "—",
      String(inService.length),
      String(lateInService),
    ];
  });

  // Worker rows: Name | Departments | Time | Late? [| Service]
  const workerRows = workers
    .slice()
    .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)))
    .map((a) => {
      const base = [
        fullName(a.user),
        departmentNames(a.user),
        formatTime(a.markedAt),
        isLate(a) ? "Yes" : "No",
      ];
      return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
    });

  // Late worker rows
  const lateWorkerRows = lateWorkers.map((a) => {
    const cutoff = cutoffFor(a.user.membershipType, serviceFor(a));
    const base = [
      fullName(a.user),
      departmentNames(a.user),
      formatTime(a.markedAt),
      String(minutesLate(a.markedAt, cutoff)),
    ];
    return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
  });

  // Non-worker rows
  const nonWorkerRows = nonWorkers
    .slice()
    .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)))
    .map((a) => {
      const base = [
        fullName(a.user),
        a.user.department ?? "—",
        formatTime(a.markedAt),
        isLate(a) ? "Yes" : "No",
      ];
      return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
    });

  // First timer rows
  const firstTimerRows = firstTimers
    .slice()
    .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)))
    .map((a) => {
      const base = [fullName(a.user), a.user.phoneNumber || "—", a.user.gender];
      return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
    });

  // Visitor rows
  const visitorRows = visitors
    .slice()
    .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)))
    .map((a) => {
      const base = [fullName(a.user), a.user.phoneNumber || "—", a.user.gender];
      return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
    });

  // 100 level student rows
  const level100Rows = level100Students
    .slice()
    .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user)))
    .map((a) => {
      const isWorker = a.user.membershipType === MembershipType.WORKER;
      const base = [
        fullName(a.user),
        a.user.gender,
        isWorker ? "Yes" : "No",
        a.user.department || "—",
        isWorker ? departmentNames(a.user) : "—",
        a.user.churchStatus === ChurchStatus.FIRST_TIMER ? "Yes" : "No",
      ];
      return isMulti ? [...base, serviceLabel(a.serviceOrder)] : base;
    });

  const headerRow = (cells: string[]) =>
    cells.map((c) => ({ text: c, bold: true, fillColor: "#f3f4f6" }));

  // Build the times line that goes under the session name. Single-service
  // shows "Service Time / Pre-service Time" inline like before; multi-service
  // just shows "Services: N" and details live in the per-service table below.
  const sessionTimesLine = isMulti
    ? [
        { text: `Services: ${sortedServices.length}`, margin: [0, 2, 0, 0] as [number, number, number, number] },
      ]
    : sortedServices.length === 1
      ? [
          { text: `Service Time: ${formatTime(sortedServices[0].serviceTime)}`, margin: [0, 2, 0, 0] as [number, number, number, number] },
          sortedServices[0].preServiceTime
            ? { text: `Pre-service Time: ${formatTime(sortedServices[0].preServiceTime)}`, margin: [0, 2, 0, 0] as [number, number, number, number] }
            : "",
        ]
      : [];

  return {
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { fontSize: 9, color: "#111827" },
    info: { title: `${sessionName} Attendance Report` },
    content: [
      // Header
      { text: churchName, style: "churchName" },
      churchAddress ? { text: churchAddress, style: "churchAddress" } : "",
      { text: "Attendance Report", style: "reportTitle", margin: [0, 8, 0, 0] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: sessionName, style: "sessionName" },
              sessionDate
                ? { text: `Date: ${formatDate(sessionDate)}`, margin: [0, 2, 0, 0] }
                : "",
              ...sessionTimesLine,
            ],
          },
          {
            width: "auto",
            alignment: "right",
            stack: [
              { text: `Generated by: ${generatedByName}` },
              { text: `Generated at: ${formatDateTime(generatedAt)}`, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 8, 0, 0],
      },

      // Summary
      { text: "Attendance Summary", style: "sectionHeading", margin: [0, 18, 0, 6] },
      {
        table: {
          widths: ["*", "auto"],
          body: [headerRow(["Metric", "Count"]), ...summaryRows],
        },
        layout: "lightHorizontalLines",
      },

      // Per-service summary (only for multi-service)
      ...(isMulti
        ? [
            { text: "Per-service Summary", style: "sectionHeading", margin: [0, 18, 0, 6] as [number, number, number, number] },
            {
              table: {
                widths: ["auto", "auto", "auto", "auto", "auto", "auto"],
                body: [
                  headerRow([
                    "Service",
                    "Service Time",
                    "Pre-service",
                    "Closes At",
                    "Attendees",
                    "Late",
                  ]),
                  ...perServiceRows,
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),

      // Department breakdown
      { text: "Department Breakdown", style: "sectionHeading", margin: [0, 18, 0, 6] },
      deptRows.length === 0
        ? { text: "No department attendance recorded.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: ["*", "auto", "auto", "auto"],
            body: [
              headerRow(["Department", "Male", "Female", "Total"]),
              ...deptRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // Workers
      { text: "Workers", style: "sectionHeading", margin: [0, 18, 0, 6] },
      workerRows.length === 0
        ? { text: "No workers in this filtered view.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti ? ["*", "*", "auto", "auto", "auto"] : ["*", "*", "auto", "auto"],
            body: [
              headerRow(
                isMulti
                  ? ["Name", "Department(s)", "Time", "Late?", "Service"]
                  : ["Name", "Department(s)", "Time", "Late?"],
              ),
              ...workerRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // Late workers
      { text: "Late Workers Report", style: "sectionHeading", margin: [0, 18, 0, 6] },
      lateWorkerRows.length === 0
        ? { text: "No late workers.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti ? ["*", "*", "auto", "auto", "auto"] : ["*", "*", "auto", "auto"],
            body: [
              headerRow(
                isMulti
                  ? ["Name", "Department(s)", "Arrival Time", "Minutes Late", "Service"]
                  : ["Name", "Department(s)", "Arrival Time", "Minutes Late"],
              ),
              ...lateWorkerRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // Non-workers
      { text: "Non-workers", style: "sectionHeading", margin: [0, 18, 0, 6] },
      nonWorkerRows.length === 0
        ? { text: "No non-workers in this filtered view.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti ? ["*", "*", "auto", "auto", "auto"] : ["*", "*", "auto", "auto"],
            body: [
              headerRow(
                isMulti
                  ? ["Name", "Department(s)", "Time", "Late?", "Service"]
                  : ["Name", "Department(s)", "Time", "Late?"],
              ),
              ...nonWorkerRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // First timers
      { text: "First Timers", style: "sectionHeading", margin: [0, 18, 0, 6] },
      firstTimerRows.length === 0
        ? { text: "No first timers recorded.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti ? ["*", "auto", "auto", "auto"] : ["*", "auto", "auto"],
            body: [
              headerRow(isMulti ? ["Name", "Phone", "Gender", "Service"] : ["Name", "Phone", "Gender"]),
              ...firstTimerRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // Visitors
      { text: "Visitors", style: "sectionHeading", margin: [0, 18, 0, 6] },
      visitorRows.length === 0
        ? { text: "No visitors recorded.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti ? ["*", "auto", "auto", "auto"] : ["*", "auto", "auto"],
            body: [
              headerRow(isMulti ? ["Name", "Phone", "Gender", "Service"] : ["Name", "Phone", "Gender"]),
              ...visitorRows,
            ],
          },
          layout: "lightHorizontalLines",
        },

      // 100 Level Students
      { text: "100 Level Students", style: "sectionHeading", margin: [0, 18, 0, 6] },
      level100Rows.length === 0
        ? { text: "No 100 level students recorded.", italics: true, color: "#6b7280" }
        : {
          table: {
            widths: isMulti
              ? ["*", "auto", "auto", "*", "*", "auto", "auto"]
              : ["*", "auto", "auto", "*", "*", "auto"],
            body: [
              headerRow(
                isMulti
                  ? ["Name", "Sex", "Worker?", "Department", "Departments", "First Timer?", "Service"]
                  : ["Name", "Sex", "Worker?", "Department", "Departments", "First Timer?"],
              ),
              ...level100Rows,
            ],
          },
          layout: "lightHorizontalLines",
        },
    ],
    styles: {
      churchName: { fontSize: 18, bold: true },
      churchAddress: { fontSize: 9, color: "#6b7280", margin: [0, 2, 0, 0] },
      reportTitle: { fontSize: 13, bold: true, color: "#374151" },
      sessionName: { fontSize: 12, bold: true },
      sectionHeading: { fontSize: 12, bold: true, color: "#1f2937" },
    },
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#9ca3af",
      margin: [0, 20, 0, 0],
    }),
  };
}
