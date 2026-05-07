import { Router, type IRouter } from "express";
import healthRouter from "./health";
import firebaseRouter from "./firebase";
import waWebRouter from "./waWeb";
import botRouter from "./bot";
import leadsRouter from "./leads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/firebase", firebaseRouter);
router.use("/wa", waWebRouter);
router.use("/bot", botRouter);
router.use("/leads", leadsRouter);

export default router;
