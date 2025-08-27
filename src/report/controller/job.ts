import { sendEmailWithAttachment } from "../../utils/email";
import logger from "../../utils/logger";
import * as admin from 'firebase-admin';
import { calculateNextRunDate } from "./report";
import { generateReport } from "../../utils/reportGenerate";
const db = admin.firestore();

const scheduleReportCollection = db.collection('scheduleReports');

export const runScheduledJobs = async () => {
    try {
        logger.info("Running scheduled jobs...");

        const now = Date.now();

        const snapshot = await scheduleReportCollection
            .where("isDeleted", "==", false)
            .where("nextRunDate", "<=", now)
            .get();

        if (snapshot.empty) {
            logger.info("No scheduled jobs to run");
            return;
        }

        for (const doc of snapshot.docs) {
            const job = doc.data() as any;
            logger.info(`Running job: ${job.id} for report ${job.reportId}`);

            const fileBuffer = await generateReport(job.reportId, job.format);
            await sendEmailWithAttachment({
                to: job.to,
                cc: job.cc,
                subject: job.subject,
                body: job.body,
                attachments: [
                    {
                        filename: `report-${job.reportId}.${job.format.toLowerCase()}`,
                        content: fileBuffer,
                    },
                ],
            });

            const nextRunDate = calculateNextRunDate(
                job.frequency,
                job.nextRunDate,
                job.hours,
                job.minutes
            );

            await doc.ref.update({
                nextRunDate,
                updatedAt: Date.now(),
            });

            logger.info(`Job ${job.id} completed. Next run at ${new Date(nextRunDate)}`);
        }
    } catch (error: any) {
        logger.error("Error running scheduled jobs", { message: error.message, stack: error.stack });
    }

};