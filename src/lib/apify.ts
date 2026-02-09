import { ApifyClient } from "apify-client";
import {
  LinkedInCompanyData,
  LinkedInPost,
  LinkedInAd,
  GoogleAd,
} from "../types/research-intelligence";

/**
 * Scrape LinkedIn company profile via Apify.
 */
export async function scrapeLinkedInCompany(
  linkedinHandle: string,
  apiKey: string
): Promise<LinkedInCompanyData> {
  const client = new ApifyClient({ token: apiKey });

  const profileUrl = linkedinHandle.startsWith("http")
    ? linkedinHandle
    : `https://www.linkedin.com/${linkedinHandle}`;

  const run = await client.actor("anchor/linkedin-company-scraper").call({
    urls: [profileUrl],
    proxy: { useApifyProxy: true },
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  const item = items[0] as Record<string, unknown> | undefined;

  if (!item) {
    return { name: linkedinHandle };
  }

  const recentPosts: LinkedInPost[] = [];
  if (Array.isArray(item.posts)) {
    for (const post of item.posts.slice(0, 10)) {
      const p = post as Record<string, unknown>;
      recentPosts.push({
        text: p.text as string | undefined,
        likes: p.likes as number | undefined,
        comments: p.comments as number | undefined,
        shares: p.shares as number | undefined,
        posted_at: p.postedAt as string | undefined,
      });
    }
  }

  return {
    name: (item.name as string) || linkedinHandle,
    description: item.description as string | undefined,
    followers: item.followers as number | undefined,
    employee_count: item.employeeCount as string | undefined,
    specialties: item.specialties as string[] | undefined,
    headquarters: item.headquarters as string | undefined,
    industry: item.industry as string | undefined,
    website: item.website as string | undefined,
    founded: item.founded as string | undefined,
    recent_posts: recentPosts,
  };
}

/**
 * Scrape LinkedIn Ad Library for a company's ads via Apify.
 */
export async function scrapeLinkedInAds(
  companyName: string,
  apiKey: string
): Promise<LinkedInAd[]> {
  const client = new ApifyClient({ token: apiKey });

  const run = await client
    .actor("silva95gustavo/linkedin-ad-library-scraper")
    .call({
      searchQuery: companyName,
      maxResults: 20,
      proxy: { useApifyProxy: true },
    });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item) => {
    const ad = item as Record<string, unknown>;
    return {
      ad_id: ad.adId as string | undefined,
      advertiser_name: ad.advertiserName as string | undefined,
      headline: ad.headline as string | undefined,
      body: ad.body as string | undefined,
      cta: ad.callToAction as string | undefined,
      image_url: ad.imageUrl as string | undefined,
      landing_page_url: ad.landingPageUrl as string | undefined,
      start_date: ad.startDate as string | undefined,
      impressions: ad.impressions as string | undefined,
    };
  });
}

/**
 * Scrape Google Ads Transparency Center for a company's ads via Apify.
 */
export async function scrapeGoogleAds(
  companyName: string,
  apiKey: string
): Promise<GoogleAd[]> {
  const client = new ApifyClient({ token: apiKey });

  const run = await client
    .actor("xtech/google-ad-transparency-scraper")
    .call({
      searchQuery: companyName,
      maxResults: 20,
      proxy: { useApifyProxy: true },
    });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items.map((item) => {
    const ad = item as Record<string, unknown>;
    return {
      ad_id: ad.adId as string | undefined,
      advertiser_name: ad.advertiserName as string | undefined,
      headline: ad.headline as string | undefined,
      description: ad.description as string | undefined,
      image_url: ad.imageUrl as string | undefined,
      landing_page_url: ad.landingPageUrl as string | undefined,
      format: ad.format as string | undefined,
      first_shown: ad.firstShown as string | undefined,
      last_shown: ad.lastShown as string | undefined,
      region: ad.region as string | undefined,
    };
  });
}
