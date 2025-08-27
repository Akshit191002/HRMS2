export enum Type {
    Employee = "Employees Snapshot Report",
    Provident_Fund = "Provident Fund Report",
    Employee_Declaration = "Employee Declaration Report",
    Payslip_Summary = "Payslip Summary Report",
    Payslip_Component = "Payslip Component Report",
    Attendance = "Attendance Time log Report",
    Attendance_Summary = "Attendance Summary Report",
    Leave = "Leave Report"
}
export interface Report {
    id?: string,
    Snum?: string,
    type: Type,
    name: string,
    description: string,
    isDeleted?: boolean,
    createdAt?: number,
    updatedAt?: number
}

export enum ReportFrequency {
    DAILY = "Daily",
    WEEKLY = "Weekly",
    MONTHLY = "Monthly"
}

export enum ReportFormat {
    CSV = "CSV",
    PDF = "PDF",
    EXCEL = "Excel"
}

export interface ScheduleReport {
    id?: string;
    reportId: string;
    frequency: ReportFrequency;
    startDate: string;
    hours: string;
    minutes: string;
    format: ReportFormat;
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    nextRunDate: number
    createdAt?: number;
    updatedAt?: number;
    isDeleted?: boolean;
}

export interface Employee_Snapshot_Template {
    name: boolean,
    emp_id: boolean,
    status: boolean,
    joining_date: boolean,
    designation: boolean,
    department: boolean,
    location: boolean,
    gender: boolean,
    email: boolean,
    pan: boolean,
    gross_salary: boolean,
    lossOfPay: boolean,
    taxPaid: boolean,
    netPay: boolean,
    leave: boolean,
    leaveAdjustment: boolean,
    leaveBalance: boolean,
    workingPattern: boolean,
    phone: boolean
}

export interface EmployeeSnapshotFilters {
    status?: string;
    joiningDate?: {
        from?: Date;
        to?: Date;
    };
    grossPay?: {
        from?: number;
        to?: number;
    };
    lossOfPay?: {
        from?: number;
        to?: number;
    };
    taxPaid?: {
        from?: number;
        to?: number;
    };
    designation?: string;
    department?: string;
    location?: string;
}
