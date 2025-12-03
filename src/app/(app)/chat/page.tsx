import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { ChatUi } from "@/components/chat/chat-ui";

export default function ChatPage() {
  return (
    <>
      <PageHeader title="AI Support Chat" />
      {/* PageContainer is removed here to allow ChatUi to take full height appropriately */}
      <div className="p-0 md:p-4"> {/* Add padding for larger screens if needed */}
        <ChatUi />
      </div>
    </>
  );
}
