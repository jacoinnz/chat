import { AuthGuard } from "@/components/auth/auth-guard";
import { TenantConfigProvider } from "@/components/providers/tenant-config-provider";
import { ChatPage } from "@/components/chat/chat-page";

export default function Home() {
  return (
    <AuthGuard>
      <TenantConfigProvider>
        <ChatPage />
      </TenantConfigProvider>
    </AuthGuard>
  );
}
