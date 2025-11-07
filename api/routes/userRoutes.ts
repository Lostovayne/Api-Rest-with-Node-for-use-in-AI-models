import { Router } from "express";
import { createUser, getUser } from "../controllers/userController";

const router = Router();

router.post("/users", createUser);
router.get("/users/:userId", getUser);

export default router;
