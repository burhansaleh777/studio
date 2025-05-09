import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Smartphone, CreditCard as CreditCardIcon } from "lucide-react"; // Renamed to avoid conflict
import { Badge } from "@/components/ui/badge";

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  policyNumber: string;
  method: "Mobile Money" | "Card";
  status: "Successful" | "Failed" | "Pending";
  receiptUrl?: string;
}

interface PaymentHistoryItemProps {
  payment: PaymentHistory;
}

export function PaymentHistoryItem({ payment }: PaymentHistoryItemProps) {
  const statusIcon = payment.status === "Successful" ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                     payment.status === "Failed" ? <XCircle className="h-5 w-5 text-red-500" /> :
                     <Smartphone className="h-5 w-5 text-yellow-500" />; // Pending
  
  const paymentMethodIcon = payment.method === "Mobile Money" ? <Smartphone className="h-4 w-4 mr-1 text-green-600" /> : <CreditCardIcon className="h-4 w-4 mr-1 text-blue-600" />;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-base">TZS {payment.amount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Policy: {payment.policyNumber}</p>
          </div>
          <Badge variant={
            payment.status === "Successful" ? "default" : 
            payment.status === "Failed" ? "destructive" : "secondary"
          } className="flex items-center gap-1 text-xs">
            {statusIcon}
            {payment.status}
          </Badge>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground flex items-center">
            {paymentMethodIcon}
            {payment.method}
          </span>
          <span className="text-xs text-muted-foreground">{payment.date}</span>
        </div>
        {payment.receiptUrl && payment.status === "Successful" && (
          <a 
            href={payment.receiptUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            View Receipt
          </a>
        )}
      </CardContent>
    </Card>
  );
}
