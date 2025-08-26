import { IUser } from "../../user/models/UserModel";

export interface IAttendanceSession {
  id: string;
  serviceName: string;
  date: Date;
  attendees?: IAttendance[];
  createdAt: Date;
}

export interface IAttendance {
  id: string;
  sessionId: string;
  userId: string;
  session?: IAttendanceSession;
  user?: IUser;
  markedAt: Date;
}