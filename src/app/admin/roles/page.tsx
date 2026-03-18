"use client";

import { useState } from "react";
import { useAdminFetch, useAdminSave, useAdminToken } from "@/hooks/use-admin-api";
import { SectionCard } from "@/components/admin/section-card";
import { MessageBanner } from "@/components/admin/save-bar";
import { Loader2, Trash2 } from "lucide-react";

interface RoleEntry {
  id: string;
  userHash: string;
  role: string;
  assignedBy: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "config_admin", label: "Config Admin" },
  { value: "auditor", label: "Auditor" },
  { value: "viewer", label: "Viewer" },
];

export default function RolesPage() {
  const { getToken } = useAdminToken();
  const { data, loading, refetch } = useAdminFetch<{ roles: RoleEntry[] }>("/api/admin/roles");
  const { save, saving, message } = useAdminSave();
  const [newUserHash, setNewUserHash] = useState("");
  const [newRole, setNewRole] = useState("config_admin");

  const handleAssign = async () => {
    if (!newUserHash || newUserHash.length !== 64) return;
    const ok = await save("/api/admin/roles", { userHash: newUserHash, role: newRole }, "Role assigned");
    if (ok) {
      setNewUserHash("");
      refetch();
    }
  };

  const handleDelete = async (userHash: string) => {
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userHash }),
      });
      if (res.ok) refetch();
    } catch {
      // Best-effort
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-[#1a2a3a]">Role Management</h2>
        <p className="text-sm text-[#667781] mt-1">
          Assign internal roles to control access levels. Azure AD admins default to Platform Admin.
        </p>
      </div>

      {message && <MessageBanner message={message} />}

      <SectionCard title="Assign Role" description="Enter the SHA-256 hash of the user's Azure AD Object ID.">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#667781] mb-1">User Hash (64 chars)</label>
            <input
              type="text"
              value={newUserHash}
              onChange={(e) => setNewUserHash(e.target.value)}
              placeholder="SHA-256 hash of user OID..."
              className="w-full px-3 py-1.5 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2]"
            />
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-[#667781] mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#d0d8e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1976d2]"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={saving || newUserHash.length !== 64}
            onClick={handleAssign}
            className="px-4 py-1.5 text-sm font-medium text-white bg-[#1976d2] rounded-md hover:bg-[#1565c0] disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Current Roles">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#1976d2]" />
          </div>
        ) : data?.roles && data.roles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#667781] border-b border-[#e8eef4]">
                  <th className="pb-2 font-medium">User Hash</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Assigned By</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.roles.map((r) => (
                  <tr key={r.id} className="border-b border-[#e8eef4] last:border-0">
                    <td className="py-2 font-mono text-xs text-[#667781]">
                      {r.userHash.slice(0, 12)}...
                    </td>
                    <td className="py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {ROLE_OPTIONS.find((o) => o.value === r.role)?.label ?? r.role}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-[#667781]">{r.assignedBy.slice(0, 8)}...</td>
                    <td className="py-2 text-xs text-[#667781]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.userHash)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#667781]">
            No custom role assignments. All Azure AD admins have Platform Admin access by default.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
