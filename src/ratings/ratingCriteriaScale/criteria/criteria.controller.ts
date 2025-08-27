import { Request, Response } from "express";
import {
  addCriteria,
  fetchAllCriteria,
  modifyCriteria,
  removeCriteria,
} from "./criteria.service";
import logger from "../../../utils/logger";

export const createCriteria = async (req: Request, res: Response) => {
  try {
    const id = await addCriteria(req.body);
    res.status(201).json({ id, message: "Criteria created successfully" });
    logger.info("Rating criteria created successfully");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllCriteria = async (req: Request, res: Response) => {
  try {
    const criteria = await fetchAllCriteria();
    res.status(200).json(criteria);
    logger.info("Rating criteria fetched successfully");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCriteria = async (req: Request, res: Response) => {
  try {
    const updated = await modifyCriteria(req.params.id, req.body);
    if (!updated)
      return res.status(404).json({ message: "Criteria not found" });
    res.status(200).json({ message: "Criteria updated successfully" });
    logger.info("Rating criteria updated successfully");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCriteria = async (req: Request, res: Response) => {
  try {
    const deleted = await removeCriteria(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Criteria not found" });
    res.status(200).json({ message: "Criteria deleted successfully" });
    logger.info("Rating criteria deleted successfully");
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
