import { Request, Response } from "express";
import { addBulkRatings, getEmployeeWithRatings, updateEmployeeProjectScores } from "./rating.service";
import { RatingInput } from "./rating.model";

export const addBulkRatingsController = async (req: Request, res: Response) => {
  try {
    const data: RatingInput = req.body;
    const result = await addBulkRatings(data);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeRatingsController = async (req: Request, res: Response) => {
  try {
    const { employeeId, year, department } = req.query as {
      employeeId?: string;
      year?: string;
      department?: string;
    };
    
    const result = await getEmployeeWithRatings(employeeId, year, department);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployeeProjectScoresController = async (req: Request, res: Response) => {
  try {
    const { employeeId, year, month, projectName } = req.body;
    const { scores, areaOfDevelopment } = req.body;

    if (!employeeId || !year || !month || !projectName || !scores) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const result = await updateEmployeeProjectScores(
      employeeId,
      year,
      month,
      projectName,
      scores,
      areaOfDevelopment
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

