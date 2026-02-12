import { Router } from "express";
import healthRoutes from "./health.routes";
import intakeRoutes from "./intake.routes";
import jobsRoutes from "./jobs.routes";
import generateRoutes from "./generate.routes";

// TODO: Enable when implemented
// import projectsRoutes from "./projects.routes";
// import briefsRoutes from "./briefs.routes";
// import generationsRoutes from "./generations.routes";
// import filesRoutes from "./files.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/intake", intakeRoutes);
router.use("/jobs", jobsRoutes);
router.use("/generate", generateRoutes);

// TODO: Enable when implemented
// router.use("/projects", projectsRoutes);
// router.use("/projects", briefsRoutes);
// router.use("/projects", filesRoutes);
// router.use("/generations", generationsRoutes);

export default router;
