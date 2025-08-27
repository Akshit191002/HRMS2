import { Router } from "express";
import { authenticateFirebaseUser } from "../../../auth/middlewares/authenticateFirebaseUser";
import {
  getAllRatingScales,
  updateRatingScale,
} from "./ratingScale.controller";
import { authorizeRole1 } from "../../../auth/middlewares/authorizeRole";
import { UserRole } from "../../../auth/constants/roles";

const router = Router();

router.get("/get", authenticateFirebaseUser, getAllRatingScales);

router.put(
  "/update",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  updateRatingScale
);

export default router;
