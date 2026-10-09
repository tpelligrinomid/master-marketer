import { Router } from "express";
import { seoEnrichKeywordHandler } from "./handlers/seo-enrich-keyword";
import {
  seoRankedKeywordsHandler,
  seoKeywordGapHandler,
  seoCompetitorDomainsHandler,
  seoKeywordDataHandler,
  seoRelatedKeywordsHandler,
  seoBacklinkSummaryHandler,
} from "./handlers/seo-research";

const router = Router();

router.post("/enrich-keyword", seoEnrichKeywordHandler);

// Quick research lookups for chat tools
router.post("/ranked-keywords", seoRankedKeywordsHandler);
router.post("/keyword-gap", seoKeywordGapHandler);
router.post("/competitor-domains", seoCompetitorDomainsHandler);
router.post("/keyword-data", seoKeywordDataHandler);
router.post("/related-keywords", seoRelatedKeywordsHandler);
router.post("/backlink-summary", seoBacklinkSummaryHandler);

export default router;
