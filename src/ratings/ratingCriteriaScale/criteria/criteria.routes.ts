import { Router } from "express";
import {
  createCriteria,
  deleteCriteria,
  getAllCriteria,
  updateCriteria,
} from "./criteria.controller";
import { authenticateFirebaseUser } from "../../../auth/middlewares/authenticateFirebaseUser";
import { authorizeRole1 } from "../../../auth/middlewares/authorizeRole";
import { UserRole } from "../../../auth/constants/roles";
import { validateBody } from "../../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  validateBody(["criteriaName"]),
  createCriteria
);

router.get("/get", authenticateFirebaseUser, getAllCriteria);

router.put(
  "/update/:id",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  updateCriteria
);

router.delete(
  "/delete/:id",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  deleteCriteria
);

export default router;
