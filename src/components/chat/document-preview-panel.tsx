"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getFileTypeInfo,
  extractSiteName,
  extractFolderPath,
  formatFileSize,
} from "@/lib/file-utils";
import { stripHighlightTags, isSharePointPage } from "@/lib/content-prep";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { SearchHit } from "@/types/search";

interface DocumentPreviewPanelProps {
  hit: SearchHit;
  onClose: () => void;
}

const PAGE_TYPE = {
  label: "Page",
  color: "bg-teal-100 text-teal-800",
  emoji: "\uD83C\uDF10",
};

export function DocumentPreviewPanel({ hit, onClose }: DocumentPreviewPanelProps) {
  const { resource } = hit;
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isPage = isSharePointPage(hit);
  const fileType = isPage ? PAGE_TYPE : getFileTypeInfo(resource.name);
  const siteName = extractSiteName(resource.webUrl);
  const folderPath = extractFolderPath(resource.webUrl);
  const fields = resource.listItem?.fields;
  const summary = hit.summary ? stripHighlightTags(hit.summary) : "";
  const fileSize = formatFileSize(resource.size);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus trap for accessibility
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const handleOpen = () => {
    window.open(resource.webUrl, "_blank", "noopener,noreferrer");
  };

  const content = (
    <div
      ref={panelRef}
      role="complementary"
      aria-label="Document preview"
      tabIndex={-1}
      className={`flex flex-col bg-white border-l border-[#d0d8e0] ${
        isMobile ? "fixed inset-0 z-50" : "w-80 shrink-0"
      } h-full outline-none`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0d8e0] shrink-0">
        <h2 className="text-sm font-semibold text-[#0d3b66] truncate">Preview</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[#f0f2f5] transition-colors text-[#667781]"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Title + type */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{fileType.emoji}</span>
            <Badge variant="secondary" className={`text-[10px] ${fileType.color}`}>
              {fileType.label}
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-[#1a2a3a] break-words">
            {resource.name}
          </h3>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <MetadataRow label="Site" value={siteName} />
          <MetadataRow label="Folder" value={folderPath} />
          {resource.createdDateTime && (
            <MetadataRow
              label="Created"
              value={new Date(resource.createdDateTime).toLocaleDateString()}
            />
          )}
          {resource.lastModifiedDateTime && (
            <MetadataRow
              label="Modified"
              value={new Date(resource.lastModifiedDateTime).toLocaleDateString()}
            />
          )}
          {resource.lastModifiedBy?.user?.displayName && (
            <MetadataRow label="Modified by" value={resource.lastModifiedBy.user.displayName} />
          )}
          {fileSize && <MetadataRow label="Size" value={fileSize} />}
          {resource.createdBy?.user?.displayName && (
            <MetadataRow label="Created by" value={resource.createdBy.user.displayName} />
          )}
        </div>

        {/* Taxonomy badges */}
        {fields && Object.keys(fields).length > 0 && (
          <div>
            <h4 className="text-[10px] font-medium text-[#667781] uppercase tracking-wider mb-1.5">
              Properties
            </h4>
            <div className="flex flex-wrap gap-1">
              {fields.ContentType && (
                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-800">
                  {fields.ContentType}
                </Badge>
              )}
              {fields.Department && (
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800">
                  {fields.Department}
                </Badge>
              )}
              {fields.Status && (
                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">
                  {fields.Status}
                </Badge>
              )}
              {fields.Sensitivity && (
                <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-800">
                  {fields.Sensitivity}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div>
            <h4 className="text-[10px] font-medium text-[#667781] uppercase tracking-wider mb-1">
              Excerpt
            </h4>
            <p className="text-xs text-[#4a5568] italic leading-relaxed">{summary}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-[#d0d8e0]">
        <Button
          onClick={handleOpen}
          className="w-full h-9 bg-[#1976d2] hover:bg-[#0d3b66] text-white text-sm border-none"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in SharePoint
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
        {content}
      </>
    );
  }

  return content;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] text-[#667781] font-medium shrink-0 w-16">{label}</span>
      <span className="text-xs text-[#1a2a3a] break-words min-w-0">{value}</span>
    </div>
  );
}
