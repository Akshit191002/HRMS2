import { Timestamp } from 'firebase-admin/firestore';
import { EmpCode } from '../../employee/models/employees/employee';
import admin from '../../firebase';
import logger from "../../utils/logger";
import { Attendance, AttendanceRecord, Status } from '../models/attendance';

const db = admin.firestore();
const empCodeCollection = db.collection("empCode")
const attendanceCollection = db.collection('attendance')

const calculateHours = (inTime?: string, outTime?: string): number | null => {
  if (!inTime || !outTime) return null;

  const [inH, inM] = inTime.split(":").map(Number);
  const [outH, outM] = outTime.split(":").map(Number);

  const inDate = new Date(2000, 0, 1, inH, inM);
  const outDate = new Date(2000, 0, 1, outH, outM);

  const diffMs = outDate.getTime() - inDate.getTime();
  return diffMs / (1000 * 60 * 60);
};

function normalizeDate(value: any): Date {
  if (!value) return new Date("Invalid");
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value.toDate === "function") return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
}

const parseDate = (dateStr: string): Date => {
  const [dd, mm, yy] = dateStr.split("/").map(Number);
  const fullYear = yy < 100 ? 2000 + yy : yy;
  return new Date(fullYear, mm - 1, dd);
};

function isWeekOff(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export const addAttendance = async (records: any[]) => {
  try {
    logger.info(`Adding ${records.length} attendance records...`);
    const batch = db.batch();

    records.forEach((rec: any) => {
      const empCode = rec["Employee Id"];
      const dateStr = rec["Date (dd/mm/yy)"];
      const inTime = rec["In Time (24 hour format)"];
      const outTime = rec["Out Time (24 hour format)"];

      let status: Status;

      const hours = calculateHours(inTime, outTime);

      if (hours === null) {
        status = Status.ABSENT;
      } else if (hours >= 8) {
        status = Status.PRESENT;
      } else if (hours >= 4) {
        status = Status.HALFDAY;
      } else {
        status = Status.ABSENT;
      }
      const ref = attendanceCollection.doc();

      const parsedDate = parseDate(dateStr);

      batch.set(ref, {
        id: ref.id,
        empCode: String(empCode),
        status,
        hours: hours,
        date: parsedDate,
        year: parsedDate.getFullYear(),
        createdAt: Date.now()
      } as Attendance);
      logger.debug(`Prepared record for ${empCode} on ${parsedDate.toDateString()} with status ${status}`);
    });

    await batch.commit();

    logger.info("Attendance records saved successfully");
    return { message: "Attendance records saved successfully" };
  } catch (error: any) {
    logger.error(`Error adding attendance: ${error.message}`);
    throw new Error(`Error adding attendance: ${error.message}`);
  }
};

export const getYearlyAttendance = async (year: number) => {
  try {
    logger.info(`Fetching yearly attendance for ${year}`);

    const empSnap = await empCodeCollection
      .where("isDeleted", "==", false)
      .get();

    const employees: Record<string, EmpCode> = {};
    empSnap.forEach((doc) => {
      const data = doc.data() as EmpCode;
      employees[data.empCode] = data;
    });
    logger.debug(`Loaded ${Object.keys(employees).length} employees`);

    const attendanceSnap = await db
      .collection("attendance")
      .where("year", "==", year)
      .get();
    logger.debug(`Loaded ${attendanceSnap.size} attendance records`);

    const attendanceRecords: Attendance[] = attendanceSnap.docs.map(
      (doc) => doc.data() as Attendance
    );

    const groupedAttendance: Record<string, Attendance[]> = {};
    attendanceRecords.forEach((att) => {
      if (!groupedAttendance[att.empCode]) {
        groupedAttendance[att.empCode] = [];
      }
      groupedAttendance[att.empCode].push(att);
    });

    const result: any[] = [];

    for (const empCode in employees) {
      const empAttendance = groupedAttendance[empCode] || [];

      const monthlySummary: Record<string, any> = {};

      for (let month = 0; month < 12; month++) {
        const monthName = new Date(year, month).toLocaleString("default", {
          month: "short",
        });

        const monthAttendance = empAttendance.filter((a) => {
          const attDate = normalizeDate(a.date);
          return !isNaN(attDate.getTime()) && attDate.getMonth() === month;
        });

        const summary: Record<Status, number> = {
          [Status.PRESENT]: 0,
          [Status.ABSENT]: 0,
          [Status.LEAVE]: 0,
          [Status.WEEKOFF]: 0,
          [Status.HOLIDAY]: 0,
          [Status.HALFDAY]: 0,
        };
        monthAttendance.forEach((att) => {
          if (att.status in summary) {
            summary[att.status] += 1;
          }
        });

        monthlySummary[`${monthName}-${year}`] = summary;
      }

      result.push({
        empCode,
        empName: employees[empCode]?.fname || "Unknown",
        summary: monthlySummary,
      });
    }

    logger.info(`Yearly attendance summary generated for ${result.length} employees`);
    return result;
  } catch (error: any) {
    logger.error(`Error fetching yearly attendance: ${error.message}`);
    throw new Error(`Error fetching yearly attendance: ${error.message}`);
  }
};

export const fillMissingAttendance = async (year: number, month: number) => {
  try {
    logger.info(`Filling missing attendance for year=${year}, month=${month}`);

    const empSnap = await empCodeCollection.where("isDeleted", "==", false).get();
    const employees = empSnap.docs.map(d => d.data() as EmpCode);
    logger.debug(`Found ${employees.length} active employees`);

    const holidaySnap = await db.collection("holidayCalendar").get();
    const holidays = holidaySnap.docs.map(d => new Date(d.data().date).toDateString());

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (const emp of employees) {
      const existingSnap = await attendanceCollection
        .where("empCode", "==", emp.empCode)
        .where("year", "==", year)
        .get();

      const existingDates = new Set(
        existingSnap.docs.map(d => d.data().date.toDate().toDateString())
      );
      logger.debug(`Employee ${emp.empCode}: filling ${daysInMonth - existingDates.size} missing days`);

      let batch = db.batch();
      let batchCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);

        if (existingDates.has(date.toDateString())) continue;

        let status: Status | null = null;
        if (holidays.includes(date.toDateString())) {
          status = Status.HOLIDAY;
        } else if (isWeekOff(date)) {
          status = Status.WEEKOFF;
        }
        if (!status) continue;
        const ref = attendanceCollection.doc();
        batch.set(ref, {
          id: ref.id,
          empCode: emp.empCode,
          status,
          date,
          year,
        });

        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          logger.debug(`Committed batch of 500 for ${emp.empCode}`);
          batch = db.batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    }

    logger.info("Missing attendance fill completed");
    return { message: "Missing attendance filled successfully" };
  } catch (error: any) {
    logger.error(`Error filling missing attendance: ${error.message}`);
    throw new Error(`Error filling missing attendance: ${error.message}`);
  }
};

export const addAttendanceWithLeave = async (records: AttendanceRecord[]) => {
  try {
    logger.info(`Adding ${records.length} attendance records with leave`);

    const batch = db.batch();
    const attendanceRef = db.collection("attendance");

    records.forEach((rec) => {
      const empCode = rec["Employee Code"];
      const dateStr = rec["Date (dd/mm/yy)"];
      const leaveId = rec["Leaves ID"];
      const type = rec["Type"];
      const hoursRaw = rec["Hours"];

      const hours = hoursRaw ? Number(hoursRaw) : 0;

      let status: Status;
      if (leaveId && type) {
        status = Status.LEAVE;
      } else if (!leaveId && (!hours || hours === 0)) {
        status = Status.ABSENT;
      } else if (hours < 4) {
        status = Status.ABSENT;
      } else if (hours >= 4 && hours < 8) {
        status = Status.HALFDAY;
      } else {
        status = Status.PRESENT;
      }
      const parsedDate = parseDate(dateStr);
      const docRef = attendanceRef.doc();

      const record: Attendance = {
        id: docRef.id,
        empCode: String(empCode),
        status,
        hours,
        date: parsedDate,
        year: parsedDate.getFullYear(),
        createdAt: Date.now(),
        ...(leaveId && type ? { leaveType: type } : {})
      };

      batch.set(docRef, record);
      logger.debug(`Prepared record for ${empCode} (${status}) on ${dateStr}`);

    });

    await batch.commit();

    logger.info(`${records.length} attendance records with leave saved successfully`);
    return { message: `${records.length} attendance records added` };
  } catch (error: any) {
    logger.error(`Error adding attendance with leave: ${error.message}`);
    throw new Error(`Error adding attendance with leave: ${error.message}`);
  }
};

export const getEmployeeAttendance = async (empCode: string, year: number) => {
  try {
    logger.info(`Fetching attendance for employee ${empCode}, year=${year}`);
    const snapshot = await attendanceCollection
      .where("empCode", "==", empCode)
      .where("year", "==", year)
      .get();

    if (snapshot.empty) {
      logger.warn(`No attendance found for ${empCode} in ${year}`);

      return { empCode, year, months: [] };
    }

    const months: Record<string, Record<number, string>> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Attendance;
      const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();

      if (!months[month]) months[month] = {};
      months[month][day] = data.status;
    });

    logger.info(`Attendance fetched for ${empCode} with ${snapshot.size} records`);
    return {
      empCode,
      year,
      months,
    };
  } catch (error: any) {
    logger.error(`Error fetching attendance for ${empCode}: ${error.message}`);
    throw new Error(`Error fetching attendance: ${error.message}`);
  }
};

export const editAttendance = async (empCode: string, status: Status, year: number, dateStr: string) => {
  try {
    logger.info(`Updating attendance for ${empCode} on ${dateStr} ${year}`);

    const fullDate = new Date(`${dateStr} ${year}`);
    if (isNaN(fullDate.getTime())) {
      throw new Error(`Invalid date string: ${dateStr} ${year}`);
    }

    const start = new Date(fullDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(fullDate);
    end.setHours(23, 59, 59, 999);

    logger.debug("Date range for query", {
      start,
      end,
      startTS: Timestamp.fromDate(start),
      endTS: Timestamp.fromDate(end),
    });

    const attendanceRef = db.collection("attendance");
    const snapshot = await attendanceRef
      .where("empCode", "==", empCode)
      .where("year", "==", year)
      .where("date", ">=", Timestamp.fromDate(start))
      .where("date", "<=", Timestamp.fromDate(end))
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error(
        `No attendance record found for ${empCode} on ${dateStr} ${year}`
      );
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({ status });

    logger.info(`Attendance updated for ${empCode}, docId=${doc.id}`);
    return { message: "Attendance updated successfully" };
  } catch (error: any) {
    logger.error(`Error updating attendance for ${empCode}: ${error.message}`);
    throw new Error(`Error updating attendance: ${error.message}`);
  }
};

export const montlyAttendance = async (empCode: string, year: number, month: number) => {
  try {
    logger.info(`Fetching monthly attendance for ${empCode}, year=${year}, month=${month}`);

    const snapshot = await attendanceCollection
      .where("empCode", "==", empCode)
      .where("year", "==", year)
      .get();

    if (snapshot.empty) {
      logger.warn(`No attendance found for ${empCode} in ${year}`);
      return { empCode, year, month, days: {} };
    }

    const days: Record<number, Status> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Attendance;
      const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);

      if (date.getMonth() + 1 === month) {
        const day = date.getDate();
        days[day] = data.status;
      }
    });

    logger.info(`Monthly attendance fetched for ${empCode} with ${Object.keys(days).length} records`);
    return {
      empCode,
      year,
      month,
      days,
    };
  } catch (error: any) {
    logger.error(`Error fetching monthly attendance for ${empCode}: ${error.message}`);
    throw new Error(`Error fetching monthly attendance: ${error.message}`);
  }
}