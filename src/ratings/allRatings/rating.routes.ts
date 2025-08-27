import { Router } from "express";
import {
  addBulkRatingsController,
  getEmployeeRatingsController,
  updateEmployeeProjectScoresController,
} from "./rating.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";

const router = Router();

// POST → Add Bulk Ratings
router.post("/create", authenticateFirebaseUser, addBulkRatingsController);

// GET → Fetch Employee Ratings with Merge
router.get("/get", authenticateFirebaseUser, getEmployeeRatingsController);

router.put(
  "/update",
  authenticateFirebaseUser,
  updateEmployeeProjectScoresController
);

export default router;
