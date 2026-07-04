import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import firebaseRouter from "./firebase";
import leadsRouter from "./leads";
import settingsRouter from "./settings";
import waWebRouter from "./waWeb";
import { requireApiKey } from "../middleware/auth";

const router: IRouter = Router();

// Health is intentionally public — used by load-balancers and uptime monitors.
router.use(healthRouter);

// All other routes require a valid x-api-key header.
// Fix(C1): requireApiKey was defined but never applied — ANY caller could
// reach bot, leads, settings, and WhatsApp endpoints without credentials.
router.use(requireApiKey);

router.use("/bot",      botRouter);
router.use("/firebase", firebaseRouter);
router.use("/leads",    leadsRouter);
router.use("/settings", settingsRouter);
router.use("/wa",       waWebRouter);

export default router;
