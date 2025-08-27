import * as admin from 'firebase-admin';
import logger from '../../utils/logger';
import ExcelJS from "exceljs";
import { Parser } from "json2csv";
import { Response } from "express";
import { Employee_Snapshot_Template, EmployeeSnapshotFilters, Report, ScheduleReport } from '../models/report';
import { increaseSequence } from '../../gettingStarted/sequenceNumber/sequence.service';
import { error } from 'console';

const db = admin.firestore();
const reportCollection = db.collection('reports');
const scheduleReportCollection = db.collection('scheduleReports');
const employeeCollection = db.collection('employees');
const generalCollection = db.collection('general');
const professionalCollection = db.collection('professional');
const employeeSnapshotTemplateCollection = db.collection("employeeSnapshotTemplates");

export const generateReportId = async (): Promise<string> => {
    const report = await increaseSequence("Report");
    const prefix = report?.prefix;
    let code = report?.nextAvailableNumber;
    if (!code) {
        throw error;
    }
    code -= 1;
    return `${prefix}${String(code)}`;
};

export const calculateNextRunDate = (
    frequency: "Daily" | "Weekly" | "Monthly",
    startDate: string,
    hours: number,
    minutes: number
): number => {
    const now = new Date();

    let nextDate = new Date(startDate);
    nextDate.setHours(hours, minutes, 0, 0);

    if (frequency === "Daily") {
        if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 1);
        }
    } else if (frequency === "Weekly") {
        if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 7);
        }
    } else if (frequency === "Monthly") {
        if (nextDate <= now) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
    }

    return nextDate.getTime();
};

export const formattedDated = (nextRunDate: number) => {
    const formatted = new Date(nextRunDate).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    return formatted;
}


export const createReport = async (data: Report) => {
    try {
        logger.info('Creating new report');

        const docRef = reportCollection.doc();
        const report: Report = {
            ...data,
            id: docRef.id,
            Snum: await generateReportId(),
            isDeleted: false,
            createdAt: Date.now()
        };
        await docRef.set(report);
        logger.info('Report created successfully', { reportId: docRef.id });

        return {
            message: 'Report created successfully',
            report: report,
        };
    } catch (error) {
        logger.error('Error creating report', { error });
        throw error;
    }
};

export const deleteReport = async (id: string) => {
    try {
        logger.info('Deleting report', { reportId: id });

        const reportRef = reportCollection.doc(id);
        const snap = await reportRef.get();

        if (!snap.exists) {
            throw new Error("Report not found");
        }

        await reportRef.update({ isDeleted: true });

        logger.info('Report deleted successfully', { reportId: id });
        return {
            message: 'Report deleted successfully',
        };
    } catch (error) {
        logger.error('Error deleting report', { error });
        throw error;
    }
};

export const getAllReport = async (page: number, limit: number) => {
    try {
        logger.info(`Fetching reports | page: ${page}, limit: ${limit}`);

        const query = reportCollection
            .where('isDeleted', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            logger.warn('No reports found');
            return {
                message: 'No reports found',
                reports: [],
                page,
                limit,
            };
        }

        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Report[];

        logger.info('Reports fetched successfully');
        return {
            message: 'Reports fetched successfully',
            reports,
            page,
            limit,
            total: snapshot.size,
        };
    } catch (error) {
        logger.error('Error fetching reports', { error });
        throw error;
    }
};

export const createScheduleReport = async (reportId: string, data: ScheduleReport) => {
    try {
        logger.info("Creating schedule report");
        const reportSnap = await reportCollection.doc(reportId).get();
        if (!reportSnap.exists) {
            throw new Error(`Report with ID ${reportId} not found`);
        }
        const docRef = scheduleReportCollection.doc();

        const nextRunDate = calculateNextRunDate(
            data.frequency,
            data.startDate,
            Number(data.hours),
            Number(data.minutes)
        );

        const scheduleReport: ScheduleReport = {
            ...data,
            nextRunDate,
            id: docRef.id,
            reportId: reportId,
            createdAt: Date.now(),
            isDeleted: false,
        };

        await docRef.set(scheduleReport);

        logger.info("Schedule report created successfully", { id: docRef.id });

        return {
            message: "Schedule report created successfully",
            scheduleReport: scheduleReport,
        };
    } catch (error) {
        logger.error("Error creating schedule report", { error });
        throw error;
    }
};

export const getAllScheduledReports = async (page: number, limit: number) => {
    try {
        const query = scheduleReportCollection
            .where("isDeleted", "==", false)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .offset((page - 1) * limit);

        const snapshot = await query.get();
        const scheduledReports = snapshot.docs.map(doc => {
            const formattedDate = formattedDated(doc.data().nextRunDate);
            return {
                id: doc.id,
                ...doc.data(),
                nextRunDate: formattedDate
            };
        });
        return {
            message: "Scheduled reports fetched successfully",
            reports: scheduledReports,
            page,
            limit,
            total: snapshot.size,
        };
    } catch (error) {
        logger.error("Error fetching scheduled reports", { error });
        throw error;
    }
};

export const updateScheduledReport = async (id: string, data: Partial<ScheduleReport>) => {
    try {
        const docRef = scheduleReportCollection.doc(id);
        const snap = await docRef.get();

        if (!snap.exists) {
            throw new Error(`Scheduled report with ID ${id} not found`);
        }

        await docRef.update({
            ...data,
            updatedAt: Date.now(),
        });

        return { message: "Scheduled report updated successfully" };
    } catch (error) {
        logger.error("Error updating scheduled report", { error });
        throw error;
    }
};

export const deleteScheduledReport = async (id: string) => {
    try {
        const docRef = scheduleReportCollection.doc(id);
        await docRef.update({ isDeleted: true });
        return { message: "Scheduled report deleted successfully" };
    } catch (error) {
        logger.error("Error deleting scheduled report", { error });
        throw error;
    }
};

export const getEmployeeSnapshotByTemplate = async (templateId: string, page?: number, limit?: number, filters: EmployeeSnapshotFilters = {}) => {
    const templateSnap = await employeeSnapshotTemplateCollection.doc(templateId).get();
    if (!templateSnap.exists) {
        throw new Error("Template not found");
    }
    const template = templateSnap.data() as Employee_Snapshot_Template;


    let query = employeeCollection.where("isDeleted", "==", false);

    if (limit) {
        query = query.offset(((page || 1) - 1) * limit).limit(limit);
    }
    const snapshot = await query.get();
    const totalSnap = await employeeCollection.where("isDeleted", "==", false).count().get();
    const total = totalSnap.data().count;

    const employees: any[] = [];

    for (const doc of snapshot.docs) {
        const empData = doc.data();

        const generalSnap = await generalCollection.doc(empData.generalId).get();
        const professionalSnap = await professionalCollection.doc(empData.professionalId).get();

        const general = generalSnap.exists ? generalSnap.data() : {};
        const professional = professionalSnap.exists ? professionalSnap.data() : {};

        if (filters.joiningDate) {
            const jd = professional?.joiningDate ? new Date(professional.joiningDate) : null;
            if (jd) {
                if (filters.joiningDate.from && jd < new Date(filters.joiningDate.from)) continue;
                if (filters.joiningDate.to && jd > new Date(filters.joiningDate.to)) continue;
            }
        }

        if (filters.grossPay) {
            const pay = Number(professional?.ctcAnnual ?? 0);
            if (filters.grossPay.from && pay < filters.grossPay.from) continue;
            if (filters.grossPay.to && pay > filters.grossPay.to) continue;
        }

        if (filters.lossOfPay) {
            const lop = Number(professional?.lossOfPay ?? 0);
            if (filters.lossOfPay.from && lop < filters.lossOfPay.from) continue;
            if (filters.lossOfPay.to && lop > filters.lossOfPay.to) continue;
        }

        if (filters.taxPaid) {
            const tax = Number(professional?.taxPaid ?? 0);
            if (filters.taxPaid.from && tax < filters.taxPaid.from) continue;
            if (filters.taxPaid.to && tax > filters.taxPaid.to) continue;
        }

        if (filters.designation && professional?.designation !== filters.designation) continue;
        if (filters.department && professional?.department !== filters.department) continue;
        if (filters.location && professional?.location !== filters.location) continue;
        if (filters.status && general?.status !== filters.status) continue;

        const formatted: Record<string, any> = {};

        formatted.name = template.name ? `${general?.name?.first ?? ""} ${general?.name?.last ?? ""}`.trim() : null;
        formatted.emp_id = template.emp_id ? general?.empCode ?? null : null;
        formatted.status = template.status ? general?.status ?? null : null;
        formatted.joining_date = template.joining_date ? professional?.joiningDate ?? null : null;
        formatted.designation = template.designation ? professional?.designation ?? null : null;
        formatted.department = template.department ? professional?.department ?? null : null;
        formatted.location = template.location ? professional?.location ?? null : null;
        formatted.gender = template.gender ? general?.gender ?? null : null;
        formatted.email = template.email ? general?.primaryEmail ?? null : null;
        formatted.pan = template.pan ? general?.panNum ?? null : null;
        formatted.gross_salary = template.gross_salary ? professional?.ctcAnnual ?? null : null;
        formatted.lossOfPay = template.lossOfPay ? professional?.lossOfPay ?? null : null;
        formatted.taxPaid = template.taxPaid ? professional?.taxPaid ?? null : null;
        formatted.netPay = template.netPay ? professional?.netPay ?? null : null;
        formatted.leave = template.leave ? professional?.leaveType ?? null : null;
        formatted.leaveAdjustment = template.leaveAdjustment ? professional?.leaveAdjustment ?? null : null;
        formatted.leaveBalance = template.leaveBalance ? professional?.leaveBalance ?? null : null;
        formatted.workingPattern = template.workingPattern ? professional?.workWeek ?? null : null;
        formatted.phone = template.phone ? general?.phoneNum?.num ?? null : null;

        employees.push(formatted);
    }

    return {
        page,
        limit,
        total,
        employees
    };
};

export const editTemplate = async (templateId: string, data: Partial<Employee_Snapshot_Template>) => {
    try {
        const templateRef = employeeSnapshotTemplateCollection.doc(templateId);
        await templateRef.update(data);
        return { message: "Template updated successfully" };
    } catch (error) {
        logger.error("Error updating template", { error });
        throw error;
    }
};


export const exportEmployeeSnapshot = async (templateId: string, format: "excel" | "csv", res: Response) => {
    const result = await getEmployeeSnapshotByTemplate(templateId);
    const employees = result.employees;

    if (!employees.length) {
        res.status(404).send("No employees found");
        return;
    }

    if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Employees");

        worksheet.addRow(Object.keys(employees[0]));

        employees.forEach(emp => worksheet.addRow(Object.values(emp)));

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=employee_snapshot.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } else {
        const json2csvParser = new Parser({ fields: Object.keys(employees[0]) });
        const csv = json2csvParser.parse(employees);

        res.header("Content-Type", "text/csv");
        res.attachment("employee_snapshot.csv");
        res.send(csv);
    }
};