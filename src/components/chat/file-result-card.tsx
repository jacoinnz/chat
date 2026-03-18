"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Copy, Heart, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getFileTypeInfo,
  extractSiteName,
  extractFolderPath,
  formatFileSize,
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
  onPreview?: (hit: SearchHit) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (url: string, title: string, siteName?: string) => void;
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

export function FileResultCard({ hit, onPreview, isFavorited, onToggleFavorite }: FileResultCardProps) {
  const { resource } = hit;
  const isPage = isSharePointPage(hit);
  const name = resource.name || "";
  const webUrl = resource.webUrl || "";
  const fileType = isPage ? PAGE_TYPE : getFileTypeInfo(name);
  const siteName = extractSiteName(webUrl);
  const folderPath = extractFolderPath(webUrl);
  const fields = resource.listItem?.fields ?? resource.fields;
  const summary = hit.summary ? stripHighlightTags(hit.summary) : "";

  const fileSize = formatFileSize(resource.size);
  const sensitivity = getSensitivityLevel(hit);
  const showWarning = requiresWarning(sensitivity);
  const banner = SENSITIVITY_BANNERS[sensitivity];
  const freshness = assessFreshness(hit);
  const keywords = fields?.Keywords
    ? fields.Keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];
  const reviewOverdue = freshness.warning?.startsWith("Review overdue") ?? false;

  const [copied, setCopied] = useState(false);

  const handleOpen = () => {
    if (!webUrl) return;
    window.open(webUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = () => {
    if (!webUrl) return;
    const downloadUrl = webUrl.includes("?")
      ? `${webUrl}&download=1`
      : `${webUrl}?download=1`;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    if (!webUrl) return;
    try {
      await navigator.clipboard.writeText(webUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback silently */ }
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.(webUrl, name, siteName);
  };

  const handlePreview = () => {
    onPreview?.(hit);
  };

  return (
    <div
      id={`file-card-${hit.hitId}`}
      role="article"
      aria-label={`File: ${name}`}
      className="rounded-md bg-[#f5f5f5] border border-[#e0e0e0] hover:bg-[#eeeeee] transition-all duration-300 overflow-hidden"
    >
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
                {name || "Untitled"}
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
                  {fileSize && ` · ${fileSize}`}
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
                {fields.ContentType && (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {fields.ContentType}
                  </span>
                )}
                {fields.Department && (
                  <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {fields.Department}
                  </span>
                )}
                {fields.Status && (
                  <span
                    className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[fields.Status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {fields.Status}
                  </span>
                )}
                {fields.Sensitivity && (
                  <span
                    className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded ${SENSITIVITY_COLORS[fields.Sensitivity] || "bg-gray-100 text-gray-600"}`}
                  >
                    {fields.Sensitivity}
                  </span>
                )}
                {fields.ReviewDate && (
                  <span
                    className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded ${
                      reviewOverdue
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Review: {new Date(fields.ReviewDate).toLocaleDateString()}
                  </span>
                )}
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {freshness.isStale && freshness.warning && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-600">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{freshness.warning}</span>
              </div>
            )}

            <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
              <Button
                size="sm"
                variant="default"
                onClick={handleOpen}
                className="h-6 text-[10px] sm:text-xs px-2 sm:px-3 bg-[#1976d2] hover:bg-[#0d3b66] text-white border-none"
                aria-label={`Open ${name}`}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-6 text-[10px] sm:text-xs px-2 sm:px-3 border-[#1976d2] text-[#1976d2] hover:bg-[#1976d2]/10"
                aria-label={`Download ${name}`}
              >
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-6 text-[10px] sm:text-xs px-2 sm:px-3 border-[#d0d8e0] text-[#667781] hover:bg-[#f0f2f5]"
                aria-label={copied ? "Link copied" : "Copy link"}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-0.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-0.5" />
                    Copy
                  </>
                )}
              </Button>
              {onToggleFavorite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`h-6 text-[10px] sm:text-xs px-2 border-[#d0d8e0] hover:bg-[#f0f2f5] ${
                    isFavorited ? "text-red-500 border-red-200" : "text-[#667781]"
                  }`}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={isFavorited}
                >
                  <Heart className={`h-3 w-3 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
              )}
              {onPreview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePreview}
                  className="h-6 text-[10px] sm:text-xs px-2 border-[#d0d8e0] text-[#667781] hover:bg-[#f0f2f5]"
                  aria-label={`Preview ${name}`}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
