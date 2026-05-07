import { Router, type IRouter } from "express";
import healthRouter from "./health";
import firebaseRouter from "./firebase";
import waWebRouter from "./waWeb";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/firebase", firebaseRouter);
router.use("/wa", waWebRouter);

export default router;
