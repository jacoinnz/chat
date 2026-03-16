import { AuthGuard } from "@/components/auth/auth-guard";
import { ChatPage } from "@/components/chat/chat-page";

export default function Home() {
  return (
    <AuthGuard>
      <ChatPage />
    </AuthGuard>
  );
}
