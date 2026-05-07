import { Router, type IRouter } from "express";
import healthRouter from "./health";
import firebaseRouter from "./firebase";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/firebase", firebaseRouter);

export default router;
