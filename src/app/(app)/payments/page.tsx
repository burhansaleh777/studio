
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { MobilePaymentForm } from "@/components/payments/mobile-payment-form";
import { PaymentHistoryItem, type PaymentHistory as PaymentHistoryType } from "@/components/payments/payment-history-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Landmark, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";


export default function PaymentsPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!currentUser) {
        setLoadingHistory(false);
        return;
      }
      setLoadingHistory(true);
      try {
        const historyRef = collection(db, "users", currentUser.uid, "payments");
        const q = query(historyRef, orderBy("paymentDate", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedHistory = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure date is string for PaymentHistoryItem, Firestore Timestamps need conversion
            date: data.paymentDate instanceof Timestamp ? data.paymentDate.toDate().toLocaleDateString() : String(data.paymentDate), 
          } as PaymentHistoryType;
        });
        setPaymentHistory(fetchedHistory);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        toast({ title: t('common.error'), description: t('paymentsPage.fetchHistoryError'), variant: "destructive"});
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPaymentHistory();
  }, [currentUser, t, toast]);

  return (
    <>
      <PageHeader title={t('paymentsPage.title')} />
      <PageContainer>
        <Tabs defaultValue="make-payment" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="make-payment" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> {t('paymentsPage.makePaymentTab')}
            </TabsTrigger>
            <TabsTrigger value="payment-history" className="flex items-center gap-2">
              <History className="h-4 w-4" /> {t('paymentsPage.historyTab')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="make-payment">
            <MobilePaymentForm />
          </TabsContent>
          <TabsContent value="payment-history">
            <h2 className="text-xl font-semibold mb-4">{t('paymentsPage.historyTitle')}</h2>
            {loadingHistory ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paymentHistory.length > 0 ? (
              <ScrollArea className="h-[400px] pr-3"> {/* Adjust height as needed */}
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <PaymentHistoryItem key={payment.id} payment={payment} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t('paymentsPage.noHistoryFound')}</p>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </>
  );
}

    