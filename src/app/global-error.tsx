"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#e8eef4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a2a3a", marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: "#667781", marginBottom: 16 }}>
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "white",
                backgroundColor: "#1976d2",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
