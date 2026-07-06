export const dynamic = 'force-dynamic';

import CustomerLayout from '@/components/shared/customer-layout';
import AiChat from '@/components/chat/ai-chat';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerLayout>
      {children}
      <AiChat />
    </CustomerLayout>
  );
}
