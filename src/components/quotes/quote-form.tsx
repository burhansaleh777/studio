
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateQuote, type GenerateQuoteInput, type GenerateQuoteOutput, GenerateQuoteInputSchema } from "@/ai/flows/generate-quote-flow"; // Ensure this path is correct

// Sub-schema for conditional validation if needed, but for now rely on GenerateQuoteInputSchema directly
const quoteFormSchema = GenerateQuoteInputSchema; // Using the schema from the flow

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
      vehicleType: undefined, // Or a sensible default like "Private Car"
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: new Date().getFullYear() - 5, // Default to 5 years old
      vehicleValue: 0,
      coverageType: undefined, // Or a sensible default like "Comprehensive"
      drivingExperience: 5,
      noClaimBonus: 0,
      additionalDrivers: "none",
      driverAge: 30,
      driverLocation: "",
    },
  });

  async function onSubmit(data: QuoteFormValues) {
    setIsLoading(true);
    setQuoteResult(null);
    setQuoteError(null);
    console.log("Quote Form Data Submitted:", data);

    try {
      const result = await generateQuote(data);
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
    { value: "Private Car", labelKey: "quoteForm.vehicleType.privateCar" },
    { value: "Motorcycle", labelKey: "quoteForm.vehicleType.motorcycle" },
    { value: "Commercial Vehicle", labelKey: "quoteForm.vehicleType.commercial" },
  ];

  const coverageTypeOptions = [
    { value: "Comprehensive", labelKey: "quoteForm.coverageType.comprehensive" },
    { value: "Third Party Only", labelKey: "quoteForm.coverageType.thirdParty" },
  ];

  const additionalDriverOptions = [
    { value: "none", labelKey: "quoteForm.additionalDrivers.none" },
    { value: "one", labelKey: "quoteForm.additionalDrivers.one" },
    { value: "two_plus", labelKey: "quoteForm.additionalDrivers.twoPlus" },
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
                    <FormControl><Input type="number" placeholder={t('quoteForm.vehicleYear.placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
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
                    <FormControl><Input type="number" placeholder={t('quoteForm.vehicleValue.placeholder')} {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="drivingExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.drivingExperience.label')}</FormLabel>
                    <FormControl><Input type="number" placeholder={t('quoteForm.drivingExperience.placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noClaimBonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.noClaimBonus.label')}</FormLabel>
                    <FormControl><Input type="number" placeholder={t('quoteForm.noClaimBonus.placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} min="0" max="100" /></FormControl>
                     <FormDescription>{t('quoteForm.noClaimBonus.description')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="additionalDrivers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.additionalDrivers.label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('quoteForm.additionalDrivers.placeholder')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {additionalDriverOptions.map(opt => (
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
                name="driverAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quoteForm.driverAge.label')}</FormLabel>
                    <FormControl><Input type="number" placeholder={t('quoteForm.driverAge.placeholder')} {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="driverLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('quoteForm.driverLocation.label')}</FormLabel>
                  <FormControl><Input placeholder={t('quoteForm.driverLocation.placeholder')} {...field} /></FormControl>
                  <FormDescription>{t('quoteForm.driverLocation.description')}</FormDescription>
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
                </CardContent>
              </Card>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    