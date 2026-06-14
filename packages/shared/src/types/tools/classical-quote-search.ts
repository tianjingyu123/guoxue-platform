export interface ClassicalQuoteSearchInput {
  keyword?: string;
  classic?: string;
  author?: string;
}

export interface QuoteResult {
  quote: string;
  source: string;
  chapter: string;
  author: string;
  dynasty: string;
  explanation: string;
  tags: string[];
}

export interface ClassicalQuoteSearchResult {
  quotes: QuoteResult[];
  summary: string;
  total: number;
}
