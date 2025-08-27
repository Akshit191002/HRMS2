import { Router } from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { authorizeRole1 } from "../../auth/middlewares/authorizeRole";
import { UserRole } from "../../auth/constants/roles";
import { validateBody } from "../../auth/middlewares/validateBody";
import { createRecord, getAllRecords } from "./records.controller";

const router = Router();

router.post(
  "/create",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  validateBody(["month"]),
  createRecord
);

router.get("/get", authenticateFirebaseUser, getAllRecords);

export default router;
