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
    <Card className="p-3 bg-background hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5" aria-hidden="true">
          {fileType.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {resource.name}
            </span>
            <Badge
              variant="secondary"
              className={`text-xs shrink-0 ${fileType.color}`}
            >
              {fileType.label}
            </Badge>
          </div>

          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
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

          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleOpen}
              className="h-7 text-xs"
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-7 text-xs"
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
