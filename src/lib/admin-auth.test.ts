import { requireRole, extractTenantInfo, type RoleTier } from "./admin-auth";
import { makeJwt } from "@/test-utils/fixtures";

// ── requireRole ─────────────────────────────────────────────────────

describe("requireRole", () => {
  function makeAdmin(role: RoleTier) {
    return { tenantId: "t1", userId: "u1", userName: "User", role };
  }

  it("allows platform_admin for any minimum role", () => {
    const admin = makeAdmin("platform_admin");
    expect(requireRole(admin, "platform_admin")).toBeNull();
    expect(requireRole(admin, "config_admin")).toBeNull();
    expect(requireRole(admin, "auditor")).toBeNull();
    expect(requireRole(admin, "viewer")).toBeNull();
  });

  it("allows config_admin for config_admin and below", () => {
    const admin = makeAdmin("config_admin");
    expect(requireRole(admin, "config_admin")).toBeNull();
    expect(requireRole(admin, "auditor")).toBeNull();
    expect(requireRole(admin, "viewer")).toBeNull();
  });

  it("denies config_admin for platform_admin", () => {
    const admin = makeAdmin("config_admin");
    const result = requireRole(admin, "platform_admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows auditor for auditor and viewer", () => {
    const admin = makeAdmin("auditor");
    expect(requireRole(admin, "auditor")).toBeNull();
    expect(requireRole(admin, "viewer")).toBeNull();
  });

  it("denies auditor for config_admin", () => {
    const admin = makeAdmin("auditor");
    const result = requireRole(admin, "config_admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows viewer only for viewer", () => {
    const admin = makeAdmin("viewer");
    expect(requireRole(admin, "viewer")).toBeNull();
  });

  it("denies viewer for auditor", () => {
    const admin = makeAdmin("viewer");
    expect(requireRole(admin, "auditor")).not.toBeNull();
  });

  it("denies viewer for platform_admin", () => {
    const admin = makeAdmin("viewer");
    const result = requireRole(admin, "platform_admin");
    expect(result!.status).toBe(403);
  });

  it("includes role name in error message", async () => {
    const admin = makeAdmin("viewer");
    const result = requireRole(admin, "config_admin");
    const body = await result!.json();
    expect(body.error).toContain("config_admin");
  });
});

// ── extractTenantInfo ───────────────────────────────────────────────

describe("extractTenantInfo", () => {
  it("extracts tenantId, userId, and userHash from a valid JWT", async () => {
    const token = makeJwt({ tid: "my-tenant", oid: "my-user" });
    const request = new Request("http://localhost/api/test", {
      headers: { authorization: `Bearer ${token}` },
    });

    const info = await extractTenantInfo(request);
    expect(info).not.toBeNull();
    expect(info!.tenantId).toBe("my-tenant");
    expect(info!.userId).toBe("my-user");
    expect(info!.userHash).toHaveLength(64); // SHA-256 hex
  });

  it("returns consistent hash for the same user OID", async () => {
    const token1 = makeJwt({ tid: "t1", oid: "same-user" });
    const token2 = makeJwt({ tid: "t2", oid: "same-user" }); // different tenant

    const req1 = new Request("http://localhost", {
      headers: { authorization: `Bearer ${token1}` },
    });
    const req2 = new Request("http://localhost", {
      headers: { authorization: `Bearer ${token2}` },
    });

    const info1 = await extractTenantInfo(req1);
    const info2 = await extractTenantInfo(req2);

    expect(info1!.userHash).toBe(info2!.userHash);
  });

  it("returns null when authorization header is missing", async () => {
    const request = new Request("http://localhost");
    expect(await extractTenantInfo(request)).toBeNull();
  });

  it("returns null when authorization is not Bearer", async () => {
    const request = new Request("http://localhost", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(await extractTenantInfo(request)).toBeNull();
  });

  it("returns null for malformed JWT (not 3 parts)", async () => {
    const request = new Request("http://localhost", {
      headers: { authorization: "Bearer not-a-jwt" },
    });
    expect(await extractTenantInfo(request)).toBeNull();
  });

  it("returns null when tid claim is missing", async () => {
    const token = makeJwt({ oid: "user-1" });
    // Override to remove tid
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    delete payload.tid;
    parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const newToken = parts.join(".");

    const request = new Request("http://localhost", {
      headers: { authorization: `Bearer ${newToken}` },
    });
    expect(await extractTenantInfo(request)).toBeNull();
  });

  it("returns null when oid claim is missing", async () => {
    const token = makeJwt({ tid: "t1" });
    const parts = token.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    delete payload.oid;
    parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const newToken = parts.join(".");

    const request = new Request("http://localhost", {
      headers: { authorization: `Bearer ${newToken}` },
    });
    expect(await extractTenantInfo(request)).toBeNull();
  });
});
