import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import catalogRouter from "./catalog";
import vaultRouter from "./vault";
import shelvesRouter from "./shelves";
import socialRouter from "./social";
import profileRouter from "./profile";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/auth", authRouter);
router.use("/catalog", catalogRouter);
router.use("/vault", vaultRouter);
router.use("/shelves", shelvesRouter);
router.use("/social", socialRouter);
router.use("/profile", profileRouter);

export default router;
