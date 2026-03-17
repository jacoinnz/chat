"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getFileTypeInfo,
  extractSiteName,
  extractFolderPath,
} from "@/lib/file-utils";
import { stripHighlightTags, isSharePointPage } from "@/lib/content-prep";
import {
  getSensitivityLevel,
  requiresWarning,
  assessFreshness,
} from "@/lib/safety";
import type { SearchHit } from "@/types/search";

interface FileResultCardProps {
  hit: SearchHit;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Archived: "bg-gray-100 text-gray-600",
};

const SENSITIVITY_COLORS: Record<string, string> = {
  Public: "bg-blue-100 text-blue-800",
  Internal: "bg-sky-100 text-sky-800",
  Confidential: "bg-orange-100 text-orange-800",
  Restricted: "bg-red-100 text-red-800",
};

const SENSITIVITY_BANNERS: Record<string, { bg: string; border: string; text: string }> = {
  Confidential: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
  },
  Restricted: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
  },
};

const PAGE_TYPE = {
  label: "Page",
  color: "bg-teal-100 text-teal-800",
  emoji: "\uD83C\uDF10",
};

export function FileResultCard({ hit }: FileResultCardProps) {
  const { resource } = hit;
  const isPage = isSharePointPage(hit);
  const fileType = isPage ? PAGE_TYPE : getFileTypeInfo(resource.name);
  const siteName = extractSiteName(resource.webUrl);
  const folderPath = extractFolderPath(resource.webUrl);
  const fields = resource.listItem?.fields;
  const summary = hit.summary ? stripHighlightTags(hit.summary) : "";

  const sensitivity = getSensitivityLevel(hit);
  const showWarning = requiresWarning(sensitivity);
  const banner = SENSITIVITY_BANNERS[sensitivity];
  const freshness = assessFreshness(hit);

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
    <div className="rounded-md bg-[#f5f5f5] border border-[#e0e0e0] hover:bg-[#eeeeee] transition-colors overflow-hidden">
      {showWarning && banner && (
        <div
          className={`flex items-center gap-1.5 px-2 py-1 ${banner.bg} ${banner.text} border-b ${banner.border}`}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="text-[10px] font-medium">
            {sensitivity.toUpperCase()} — Handle according to data policy.
          </span>
        </div>
      )}

      <div className="p-2">
        <div className="flex items-start gap-2 sm:gap-3">
          <div
            className="text-lg sm:text-2xl shrink-0 mt-0.5"
            aria-hidden="true"
          >
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

            {summary && (
              <p className="text-[10px] sm:text-xs text-[#4a5568] mt-1 line-clamp-2 leading-relaxed">
                <span className="font-medium not-italic text-[#667781]">
                  Excerpt:{" "}
                </span>
                <span className="italic">{summary}</span>
              </p>
            )}

            {fields && Object.keys(fields).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {fields.department && (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {fields.department}
                  </span>
                )}
                {fields.docType && (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                    {fields.docType}
                  </span>
                )}
                {fields.status && (
                  <span
                    className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[fields.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {fields.status}
                  </span>
                )}
                {fields.sensitivity && (
                  <span
                    className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded ${SENSITIVITY_COLORS[fields.sensitivity] || "bg-gray-100 text-gray-600"}`}
                  >
                    {fields.sensitivity}
                  </span>
                )}
                {fields.keywords && (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {fields.keywords}
                  </span>
                )}
              </div>
            )}

            {freshness.isStale && freshness.warning && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-600">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{freshness.warning}</span>
              </div>
            )}

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
    </div>
  );
}
