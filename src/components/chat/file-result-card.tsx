"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getFileTypeInfo,
  extractSiteName,
  extractFolderPath,
} from "@/lib/file-utils";
import type { SearchHit } from "@/types/search";

interface FileResultCardProps {
  hit: SearchHit;
}

export function FileResultCard({ hit }: FileResultCardProps) {
  const { resource } = hit;
  const fileType = getFileTypeInfo(resource.name);
  const siteName = extractSiteName(resource.webUrl);
  const folderPath = extractFolderPath(resource.webUrl);

  const handleOpen = () => {
    window.open(resource.webUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    const downloadUrl = resource.webUrl.includes("?")
      ? `${resource.webUrl}&download=1`
      : `${resource.webUrl}?download=1`;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="p-2 sm:p-3 bg-background hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="text-lg sm:text-2xl shrink-0 mt-0.5" aria-hidden="true">
          {fileType.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-medium text-xs sm:text-sm truncate">
              {resource.name}
            </span>
            <Badge
              variant="secondary"
              className={`text-[10px] sm:text-xs shrink-0 ${fileType.color}`}
            >
              {fileType.label}
            </Badge>
          </div>

          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 space-y-0.5">
            <div className="truncate">
              Site: {siteName} &middot; {folderPath}
            </div>
            {resource.lastModifiedBy?.user?.displayName && (
              <div>
                Modified by {resource.lastModifiedBy.user.displayName}
                {resource.lastModifiedDateTime &&
                  ` on ${new Date(resource.lastModifiedDateTime).toLocaleDateString()}`}
              </div>
            )}
          </div>

          <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleOpen}
              className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3"
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3"
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
