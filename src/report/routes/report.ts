import express from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import * as reportController from '../controller/report';
import { EmployeeSnapshotFilters } from "../models/report";

const route = express.Router()

route.post('/create', authenticateFirebaseUser, async (req, res) => {
  try {
    const report = await reportController.createReport(req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.post('/schedule/create/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const report = await reportController.createScheduleReport(req.params.id, req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const report = await reportController.getAllReport(page, limit);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.delete('/delete/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const report = await reportController.deleteReport(req.params.id);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/schedule/getAll', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const report = await reportController.getAllScheduledReports(page, limit);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/schedule/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const project = await reportController.updateScheduledReport(req.params.id, req.body);
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.delete('/delete/schedule/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const report = await reportController.deleteScheduledReport(req.params.id);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get('/getAll/employeeSnapshot/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (isNaN(limit) || isNaN(page)) {
      return res.status(400).json({ error: "Invalid or missing 'limit' or 'page' query parameters" });
    }
    const filters: EmployeeSnapshotFilters = {};
    if (req.query.joiningDateFrom || req.query.joiningDateTo) {
      filters.joiningDate = {
        from: req.query.joiningDateFrom ? new Date(req.query.joiningDateFrom as string) : undefined,
        to: req.query.joiningDateTo ? new Date(req.query.joiningDateTo as string) : undefined,
      };
    }

    if (req.query.grossPayFrom || req.query.grossPayTo) {
      filters.grossPay = {
        from: req.query.grossPayFrom ? Number(req.query.grossPayFrom) : undefined,
        to: req.query.grossPayTo ? Number(req.query.grossPayTo) : undefined,
      };
    }

    if (req.query.lossOfPayFrom || req.query.lossOfPayTo) {
      filters.lossOfPay = {
        from: req.query.lossOfPayFrom ? Number(req.query.lossOfPayFrom) : undefined,
        to: req.query.lossOfPayTo ? Number(req.query.lossOfPayTo) : undefined,
      };
    }

    if (req.query.taxPaidFrom || req.query.taxPaidTo) {
      filters.taxPaid = {
        from: req.query.taxPaidFrom ? Number(req.query.taxPaidFrom) : undefined,
        to: req.query.taxPaidTo ? Number(req.query.taxPaidTo) : undefined,
      };
    }

    if (req.query.designation) filters.designation = req.query.designation as string;
    if (req.query.department) filters.department = req.query.department as string;
    if (req.query.location) filters.location = req.query.location as string;
    if (req.query.status) filters.status = req.query.status as string;

    const report = await reportController.getEmployeeSnapshotByTemplate(req.params.id, page, limit, filters);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.patch('/updateTemplate/:id', authenticateFirebaseUser, async (req, res) => {
  try {
    const report = await reportController.editTemplate(req.params.id, req.body);
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

route.get("/export/employeeSnapshot/:id", authenticateFirebaseUser, async (req, res) => {
  try {
    const format = (req.query.format as "excel" | "csv") || "excel";
    await reportController.exportEmployeeSnapshot(req.params.id, format, res);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


export default route;