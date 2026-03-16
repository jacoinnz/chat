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
}
