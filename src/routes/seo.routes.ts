import { Router } from "express";
import { seoEnrichKeywordHandler } from "./handlers/seo-enrich-keyword";

const router = Router();

router.post("/enrich-keyword", seoEnrichKeywordHandler);

export default router;
