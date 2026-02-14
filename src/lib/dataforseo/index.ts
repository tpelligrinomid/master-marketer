export { DataForSeoClient } from "./client";
export {
  submitCrawlTask,
  pollCrawlReady,
  getCrawlSummary,
  getCrawlPages,
  getDuplicateTags,
  getRedirectChains,
  getNonIndexable,
  getMicrodata,
  getLighthouseResults,
} from "./onpage";
export {
  getRankedKeywords,
  getDomainIntersection,
  getCompetitorDomains,
  getSearchIntent,
} from "./labs";
export {
  getBacklinkSummary,
  getBacklinks,
  getAnchors,
  getReferringDomains,
  getBacklinkIntersection,
} from "./backlinks";
export { getSerpResults } from "./serp";
export {
  getLlmMentions,
  getChatGptResponses,
  getPerplexityResponses,
} from "./ai-optimization";
