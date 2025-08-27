import { Request, Response } from "express";
import { addRecord, fetchAllRecords } from "./records.service";

export const createRecord = async (req: Request, res: Response) => {
  try {
    const id = await addRecord(req.body);
    res.status(201).json({ id, message: "Record created successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRecords = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    const records = await fetchAllRecords(year ? Number(year) : undefined);

    res.status(200).json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
