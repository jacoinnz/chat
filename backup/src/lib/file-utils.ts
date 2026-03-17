const FILE_TYPE_MAP: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  docx: { label: "Word", color: "bg-blue-100 text-blue-800", emoji: "📄" },
  doc: { label: "Word", color: "bg-blue-100 text-blue-800", emoji: "📄" },
  xlsx: { label: "Excel", color: "bg-green-100 text-green-800", emoji: "📊" },
  xls: { label: "Excel", color: "bg-green-100 text-green-800", emoji: "📊" },
  pptx: {
    label: "PowerPoint",
    color: "bg-orange-100 text-orange-800",
    emoji: "📽️",
  },
  ppt: {
    label: "PowerPoint",
    color: "bg-orange-100 text-orange-800",
    emoji: "📽️",
  },
  pdf: { label: "PDF", color: "bg-red-100 text-red-800", emoji: "📕" },
  png: { label: "Image", color: "bg-purple-100 text-purple-800", emoji: "🖼️" },
  jpg: { label: "Image", color: "bg-purple-100 text-purple-800", emoji: "🖼️" },
  jpeg: {
    label: "Image",
    color: "bg-purple-100 text-purple-800",
    emoji: "🖼️",
  },
  gif: { label: "Image", color: "bg-purple-100 text-purple-800", emoji: "🖼️" },
  svg: { label: "Image", color: "bg-purple-100 text-purple-800", emoji: "🖼️" },
  txt: { label: "Text", color: "bg-gray-100 text-gray-800", emoji: "📝" },
  csv: { label: "CSV", color: "bg-green-100 text-green-800", emoji: "📊" },
  json: { label: "JSON", color: "bg-yellow-100 text-yellow-800", emoji: "📋" },
  mp4: { label: "Video", color: "bg-pink-100 text-pink-800", emoji: "🎬" },
  zip: { label: "Archive", color: "bg-amber-100 text-amber-800", emoji: "📦" },
};

const DEFAULT_FILE_TYPE = {
  label: "File",
  color: "bg-gray-100 text-gray-800",
  emoji: "📄",
};

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function getFileTypeInfo(filename: string) {
  const ext = getFileExtension(filename);
  return FILE_TYPE_MAP[ext] || DEFAULT_FILE_TYPE;
}

export function extractSiteName(webUrl: string): string {
  try {
    const url = new URL(webUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const sitesIndex = pathParts.findIndex(
      (p) => p === "sites" || p === "teams"
    );
    if (sitesIndex !== -1 && pathParts[sitesIndex + 1]) {
      return decodeURIComponent(pathParts[sitesIndex + 1]);
    }
    return url.hostname.split(".")[0];
  } catch {
    return "SharePoint";
  }
}

export function formatFileSize(bytes?: number): string | undefined {
  if (bytes == null || bytes === 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractFolderPath(webUrl: string): string {
  try {
    const url = new URL(webUrl);
    const pathParts = url.pathname.split("/");
    pathParts.pop();
    const sitesIndex = pathParts.findIndex(
      (p) => p === "sites" || p === "teams"
    );
    if (sitesIndex !== -1) {
      return (
        decodeURIComponent(pathParts.slice(sitesIndex + 2).join("/")) || "/"
      );
    }
    return decodeURIComponent(pathParts.join("/")) || "/";
  } catch {
    return "/";
  }
}
