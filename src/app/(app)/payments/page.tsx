import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { MobilePaymentForm } from "@/components/payments/mobile-payment-form";
import { PaymentHistoryItem, type PaymentHistory } from "@/components/payments/payment-history-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Landmark } from "lucide-react";

// Mock data for payment history
const paymentHistory: PaymentHistory[] = [
  { id: "1", date: "2024-07-10", amount: 50000, policyNumber: "BIMA-001", method: "Mobile Money", status: "Successful", receiptUrl: "#" },
  { id: "2", date: "2024-06-15", amount: 120000, policyNumber: "BIMA-003", method: "Card", status: "Successful", receiptUrl: "#" },
  { id: "3", date: "2024-05-20", amount: 75000, policyNumber: "BIMA-002", method: "Mobile Money", status: "Failed" },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <PageContainer>
        <Tabs defaultValue="make-payment" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="make-payment" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Make Payment
            </TabsTrigger>
            <TabsTrigger value="payment-history" className="flex items-center gap-2">
              <History className="h-4 w-4" /> Payment History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="make-payment">
            <MobilePaymentForm />
          </TabsContent>
          <TabsContent value="payment-history">
            <h2 className="text-xl font-semibold mb-4">Your Payment History</h2>
            {paymentHistory.length > 0 ? (
              <ScrollArea className="h-[400px] pr-3"> {/* Adjust height as needed */}
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <PaymentHistoryItem key={payment.id} payment={payment} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-8">No payment history found.</p>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}
