import { Request, Response } from "express";
import { fetchAllRatingScales, modifyRatingScale } from "./ratingScale.service";
import logger from "../../../utils/logger";

export const getAllRatingScales = async (req: Request, res: Response) => {
  try {
    const data = await fetchAllRatingScales();
    logger.info("RatingScale fetched successfully");
    res.status(200).json(data);
  } catch (error) {
    logger.error("Error fetching rating scales:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateRatingScale = async (req: Request, res: Response) => {
  try {
    const { scaleId, description } = req.body;
    if (!scaleId || !description) {
      return res
        .status(400)
        .json({ message: "scaleId and description are required" });
    }

    const success = await modifyRatingScale(scaleId, description);

    if (!success) {
      return res.status(404).json({ message: "Data Not Found" });
    }
    logger.info("RatingScale update successfully");
    res.status(200).json({ message: "Rating scale updated successfully" });
  } catch (error) {
    logger.error("Error updating rating scale:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
