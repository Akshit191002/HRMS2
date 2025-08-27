import { parse as json2csv } from "json2csv";
import ExcelJS from "exceljs";
import { getEmployeeSnapshotByTemplate } from "../report/controller/report";

export const generateReport = async (reportId: string, format: string): Promise<Buffer> => {
    const employees = await getEmployeeSnapshotByTemplate("9lqAOIcGENfsE6FPg8bx", 1, 1000);

    if (format === "CSV") {
        const csv = json2csv(employees.employees);
        return Buffer.from(csv, "utf-8");
    }

    if (format === "XLSX") {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");

        sheet.addRow(Object.keys(employees.employees[0]));

        employees.employees.forEach(emp => {
            sheet.addRow(Object.values(emp));
        });

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer as ArrayBuffer);
    }

    throw new Error(`Unsupported format: ${format}`);
};
