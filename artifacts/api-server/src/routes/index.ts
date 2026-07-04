import { Router, type IRouter } from "express";
import { requireApiKey } from "../middleware/auth";
import healthRouter from "./health";
import firebaseRouter from "./firebase";
import waWebRouter from "./waWeb";
import botRouter from "./bot";
import leadsRouter from "./leads";
import settingsRouter from "./settings";

const router: IRouter = Router();

// Health check is intentionally unauthenticated — needed for uptime probes
// and the Admin Panel ping button before a key is configured.
router.use(healthRouter);

// All other routes require a valid X-API-Key header matching API_INTERNAL_KEY.
router.use(requireApiKey);
router.use("/firebase", firebaseRouter);
router.use("/wa", waWebRouter);
router.use("/bot", botRouter);
router.use("/leads", leadsRouter);
router.use(settingsRouter);

export default router;
