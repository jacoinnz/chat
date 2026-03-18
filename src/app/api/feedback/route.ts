import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractTenantInfo } from "@/lib/admin-auth";
import { feedbackSchema, validateBody } from "@/lib/validations";

/** POST /api/feedback — submit feedback on an AI response. Regular chat users, not admin-only. */
export async function POST(request: Request) {
  const info = await extractTenantInfo(request);
  if (!info) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const v = validateBody(feedbackSchema, body);
    if (!v.success) return v.response;

    const { messageId, feedbackType, comment } = v.data;

    await prisma.feedback.create({
      data: {
        tenantId: info.tenantId,
        messageId,
        userHash: info.userHash,
        feedbackType,
        comment,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
