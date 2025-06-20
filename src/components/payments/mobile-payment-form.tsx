
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, CreditCard as CreditCardIcon } from "lucide-react"; 
import Image from "next/image";

const paymentSchema = z.object({
  policyNumber: z.string().min(1, "Policy number is required"),
  amount: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Amount must be positive")
  ),
  paymentMethod: z.enum(["mobile_money", "card"], { required_error: "Please select a payment method" }),
  mobileNumber: z.string().optional(), // Conditional validation would be better
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

// Mock data for policies needing payment
const userPolicies = [
  { id: "BIMA-001", name: "Toyota IST - Renewal", amountDue: 50000 },
  { id: "BIMA-002", name: "Nissan March - New", amountDue: 75000 },
];

export function MobilePaymentForm() {
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      policyNumber: "",
      amount: 0,
      paymentMethod: undefined,
    },
  });

  const selectedPaymentMethod = form.watch("paymentMethod");

  function onSubmit(data: PaymentFormValues) {
    console.log("Payment Data:", data);
    toast({
      title: "Payment Initiated",
      description: `Processing payment of TZS ${data.amount} for policy ${data.policyNumber} via ${data.paymentMethod}.`,
      variant: "default",
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          Secure Payment
        </CardTitle>
        <CardDescription>Pay for your insurance policy quickly and safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy / Reference Number</FormLabel>
                   <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedPolicy = userPolicies.find(p => p.id === value);
                      if (selectedPolicy) {
                        form.setValue("amount", selectedPolicy.amountDue, { shouldValidate: true });
                      }
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select policy to pay for" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userPolicies.map(policy => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name} (Due: TZS {policy.amountDue.toLocaleString()})
                        </SelectItem>
                      ))}
                       <SelectItem value="other">Other (Enter Manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === "other" && <Input placeholder="Enter Policy/Reference Number" className="mt-2" onChange={field.onChange} />}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (TZS)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mobile_money">
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 mr-2 text-green-600" /> Mobile Money
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center">
                          <CreditCardIcon className="h-4 w-4 mr-2 text-blue-600" /> Bank Card
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPaymentMethod === "mobile_money" && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <div className="flex items-center justify-around mb-2">
                  <Image data-ai-hint="Mpesa logo" src="https://picsum.photos/seed/mpesa/60/30" alt="M-Pesa" width={60} height={30} className="object-contain" />
                  <Image data-ai-hint="TigoPesa logo" src="https://picsum.photos/seed/tigopesa/60/30" alt="Tigo Pesa" width={60} height={30} className="object-contain" />
                  <Image data-ai-hint="AirtelMoney logo" src="https://picsum.photos/seed/airtelmoney/60/30" alt="Airtel Money" width={60} height={30} className="object-contain" />
                </div>
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="e.g., 0712345678" {...field} />
                      </FormControl>
                      <FormDescription>Enter the number registered for mobile money.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {selectedPaymentMethod === "card" && (
              <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                <FormField control={form.control} name="cardNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Number</FormLabel>
                    <FormControl><Input placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry (MM/YY)</FormLabel>
                      <FormControl><Input placeholder="MM/YY" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cvv" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl><Input placeholder="•••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!selectedPaymentMethod}>
              Pay TZS {form.getValues("amount") > 0 ? form.getValues("amount").toLocaleString() : '0'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            All transactions are secured and encrypted. For support, contact us via the Chat.
        </p>
      </CardFooter>
    </Card>
  );
}
