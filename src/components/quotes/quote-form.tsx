
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateQuote, type GenerateQuoteInput, type GenerateQuoteOutput } from "@/ai/flows/generate-quote-flow";

const quoteFormSchema = z.object({
  vehicleType: z.string({required_error: "Vehicle type is required."}).min(1, "Vehicle type is required."),
  vehicleMake: z.string().min(1, "Vehicle make is required."),
  vehicleModel: z.string().min(1, "Vehicle model is required."),
  vehicleYear: z.preprocess(
    (val) => (String(val).trim() === "" ? undefined : parseInt(String(val), 10)),
    z.number({required_error: "Vehicle year is required.", invalid_type_error: "Vehicle year must be a number."})
      .min(1900, "Year must be 1900 or later.")
      .max(new Date().getFullYear() + 1, `Year cannot be after ${new Date().getFullYear() + 1}.`)
  ),
  vehicleValue: z.preprocess(
    (val) => (String(val).trim() === "" ? undefined : parseFloat(String(val))),
    z.number({required_error: "Vehicle value is required.", invalid_type_error: "Vehicle value must be a number."})
      .positive("Vehicle value must be positive.")
  ),
  coverageType: z.string({required_error: "Coverage type is required."}).min(1, "Coverage type is required."),
  hasPriorClaims: z.boolean().default(false),
  vehicleUsage: z.string({required_error: "Vehicle usage is required."}).min(1, "Vehicle usage is required.").default("Private"),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export function QuoteForm() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [quoteResult, setQuoteResult] = useState<GenerateQuoteOutput | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      vehicleType: undefined,
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: '', // Keep as empty string for controlled input
      vehicleValue: '', // Keep as empty string
      coverageType: undefined,
      hasPriorClaims: false,
      vehicleUsage: "Private",
    },
  });

  async function onSubmit(data: QuoteFormValues) {
    setIsLoading(true);
    setQuoteResult(null);
    setQuoteError(null);
    console.log("Quote Form Data Submitted for AI:", data);

    // Ensure data types match GenerateQuoteInput for AI flow
    const aiInput: GenerateQuoteInput = {
        ...data,
        vehicleYear: Number(data.vehicleYear), // Ensure conversion if Zod preprocess doesn't guarantee number type for AI
        vehicleValue: Number(data.vehicleValue), // Ensure conversion
    };

    try {
      const result = await generateQuote(aiInput);
      setQuoteResult(result);
      toast({
        title: t('quoteForm.toast.successTitle'),
        description: t('quoteForm.toast.successDescription', { quoteId: result.quoteId }),
      });
    } catch (error) {
      console.error("Error generating quote:", error);
      const errorMessage = error instanceof Error ? error.message : t('quoteForm.toast.errorDefault');
      setQuoteError(errorMessage);
      toast({
        title: t('quoteForm.toast.errorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const vehicleTypeOptions = [
    { value: "Motor Vehicles", labelKey: "quoteForm.vehicleType.motorVehicles" },
    { value: "2-Wheelers", labelKey: "quoteForm.vehicleType.twoWheelers" },
    { value: "3-Wheelers", labelKey: "quoteForm.vehicleType.threeWheelers" },
  ];

  const coverageTypeOptions = [
    { value: "Comprehensive", labelKey: "quoteForm.coverageType.comprehensive" },
    { value: "Third Party Only", labelKey: "quoteForm.coverageType.thirdParty" },
    { value: "Third Party Fire & Theft", labelKey: "quoteForm.coverageType.tpft" },
  ];

  const vehicleUsageOptions = [
    { value: "Private", labelKey: "quoteForm.vehicleUsage.private" },
    { value: "Commercial", labelKey: "quoteForm.vehicleUsage.commercial" },
  ];


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{t('quoteForm.title')}</CardTitle>
        <CardDescription>{t('quoteForm.description')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quoteForm.vehicleType.label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('quoteForm.vehicleType.placeholder')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vehicleUsage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quoteForm.vehicleUsage.label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('quoteForm.vehicleUsage.placeholder')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleUsageOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleMake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.vehicleMake.label')}</FormLabel>
                    <FormControl><Input placeholder={t('quoteForm.vehicleMake.placeholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.vehicleModel.label')}</FormLabel>
                    <FormControl><Input placeholder={t('quoteForm.vehicleModel.placeholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="vehicleYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.vehicleYear.label')}</FormLabel>
                    <FormControl><Input type="number" placeholder={t('quoteForm.vehicleYear.placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.vehicleValue.label')}</FormLabel>
                    <FormControl><Input type="number" placeholder={t('quoteForm.vehicleValue.placeholder')} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : e.target.value)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="coverageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quoteForm.coverageType.label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('quoteForm.coverageType.placeholder')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coverageTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="hasPriorClaims"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>{t('quoteForm.hasPriorClaims.label')}</FormLabel>
                        <FormDescription>
                        {t('quoteForm.hasPriorClaims.description')}
                        </FormDescription>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />

          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('quoteForm.submitButton')}
            </Button>

            {quoteResult && !isLoading && (
              <Card className="bg-green-50 border-green-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-green-700 flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> {t('quoteForm.result.successTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-green-600 space-y-1">
                  <p><strong>{t('quoteForm.result.quoteIdLabel')}:</strong> {quoteResult.quoteId}</p>
                  <p><strong>{t('quoteForm.result.premiumLabel')}:</strong> {quoteResult.premiumAmount.toLocaleString()} {quoteResult.currency}</p>
                  <p><strong>{t('quoteForm.result.summaryLabel')}:</strong> {quoteResult.quoteDetails}</p>
                  {quoteResult.effectiveCoverageRule && <p><strong>{t('quoteForm.result.effectiveCoverageRuleLabel')}:</strong> {quoteResult.effectiveCoverageRule}</p>}
                </CardContent>
              </Card>
            )}

            {quoteError && !isLoading && (
              <Card className="bg-red-50 border-red-200 shadow-md">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg text-red-700 flex items-center">
                    <ShieldAlert className="mr-2 h-5 w-5" /> {t('quoteForm.result.errorTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-red-600">
                  <p>{quoteError}</p>
                  <p>{t('quoteForm.result.errorGuidance')}</p>
                </CardContent>
              </Card>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
