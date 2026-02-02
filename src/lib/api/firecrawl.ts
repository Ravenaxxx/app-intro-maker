import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

type ScrapeData = {
  markdown?: string;
  screenshot?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    statusCode?: number;
  };
};

type SearchResult = {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
  screenshot?: string;
};

type SearchData = SearchResult[];

type ScrapeOptions = {
  formats?: ('markdown' | 'html' | 'screenshot' | 'links')[];
  onlyMainContent?: boolean;
  waitFor?: number;
};

type SearchOptions = {
  limit?: number;
  lang?: string;
  country?: string;
};

export const firecrawlApi = {
  // Scrape a single URL
  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse<ScrapeData>> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    
    // Handle Firecrawl v1 API response structure
    return {
      success: data?.success ?? true,
      error: data?.error,
      data: data?.data || data,
    };
  },

  // Search the web and scrape results
  async search(query: string, options?: SearchOptions): Promise<FirecrawlResponse<SearchData>> {
    const { data, error } = await supabase.functions.invoke('firecrawl-search', {
      body: { query, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success ?? true,
      error: data?.error,
      data: data?.data || [],
    };
  },
};

export type { ScrapeData, SearchResult, SearchData, ScrapeOptions, SearchOptions };
