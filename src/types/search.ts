export interface SearchHit {
  hitId: string;
  rank: number;
  summary: string;
  resource: DriveItemResource;
}

export interface DriveItemResource {
  "@odata.type": string;
  name: string;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  size?: number;
  createdBy?: {
    user: { displayName: string };
  };
  lastModifiedBy?: {
    user: { displayName: string };
  };
  parentReference?: {
    siteId?: string;
    driveId?: string;
    sharepointIds?: {
      listId?: string;
      listItemId?: string;
      listItemUniqueId?: string;
    };
  };
  listItem?: {
    fields?: Record<string, string>;
  };
}

export interface SearchResponse {
  value: Array<{
    searchTerms: string[];
    hitsContainers: Array<{
      total: number;
      moreResultsAvailable: boolean;
      hits: SearchHit[];
    }>;
  }>;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  results?: SearchHit[];
  timestamp: Date;
  isLoading?: boolean;
  isStreaming?: boolean;
  intent?: {
    intent: string;
    refinedQuery: string;
    sortByRecency: boolean;
    detectedFilters: Record<string, string | boolean | undefined>;
  };
}

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}

export interface DocumentContext {
  index: number;
  name: string;
  webUrl: string;
  summary: string;
  lastModified: string;
  modifiedBy?: string;
  contentType?: string;
  department?: string;
  sensitivity?: string;
  status?: string;
  isStale: boolean;
  stalenessWarning?: string;
}

export interface ApiConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiRequest {
  messages: ApiConversationMessage[];
  currentDocuments: DocumentContext[];
  keywords?: Array<{ term: string; synonyms: string[] }>;
}
