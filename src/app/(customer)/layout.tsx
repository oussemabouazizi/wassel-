import CustomerLayout from '@/components/shared/customer-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
