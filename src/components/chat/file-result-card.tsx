"use client";

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
    <div className="p-2 rounded-md bg-[#f5f5f5] border border-[#e0e0e0] hover:bg-[#eeeeee] transition-colors">
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

          <div className="text-[10px] sm:text-xs text-[#667781] mt-1 space-y-0.5">
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
              className="h-6 text-[10px] sm:text-xs px-2 sm:px-3 bg-[#1976d2] hover:bg-[#0d3b66] text-white border-none"
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-6 text-[10px] sm:text-xs px-2 sm:px-3 border-[#1976d2] text-[#1976d2] hover:bg-[#1976d2]/10"
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
