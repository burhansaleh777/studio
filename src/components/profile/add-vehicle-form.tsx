
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Car, Loader2 } from "lucide-react";
import React, { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Vehicle } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";

const vehicleSchema = z.object({
  make: z.string().min(1, "Vehicle make is required (e.g., Toyota)"),
  model: z.string().min(1, "Vehicle model is required (e.g., Corolla)"),
  year: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(1900, "Year must be after 1900").max(new Date().getFullYear() + 1, `Year cannot be after ${new Date().getFullYear() + 1}`)
  ),
  registrationNumber: z.string().min(1, "Registration plate number is required"),
  // documents: z.array(z.instanceof(File)).optional(), // File upload to storage is a more complex step
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface AddVehicleFormProps {
  onVehicleAdded: () => void; // Callback after successful addition
}

export function AddVehicleForm({ onVehicleAdded }: AddVehicleFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  // const [documentPreviews, setDocumentPreviews] = React.useState<string[]>([]); // For when file uploads are implemented

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      registrationNumber: "",
      // documents: [],
    },
  });

  async function onSubmit(data: VehicleFormValues) {
    if (!currentUser) {
      toast({ title: t('common.error'), description: t('auth.notAuthenticatedError'), variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
      const vehicleData: Omit<Vehicle, 'id' | 'imageUrl' | 'documents'> & { userId: string; createdAt: any } = {
        ...data,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      // For now, documents are not uploaded. If you implement document uploads,
      // you'd upload them to Firebase Storage here and store their URLs.
      // vehicleData.documents = []; // Or map uploaded document URLs

      await addDoc(collection(db, "users", currentUser.uid, "vehicles"), vehicleData);

      toast({
        title: t('addVehicleForm.toast.successTitle'),
        description: t('addVehicleForm.toast.successDescription', { make: data.make, model: data.model }),
      });
      form.reset();
      // setDocumentPreviews([]);
      if (onVehicleAdded) {
        onVehicleAdded(); // This will now trigger a re-fetch on the profile page
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast({
        title: t('addVehicleForm.toast.errorTitle'),
        description: (error as Error).message || t('addVehicleForm.toast.errorDefault'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = Array.from(event.target.files || []);
  //   form.setValue("documents", files, { shouldValidate: true });
  //   const previews = files.map(file => file.name);
  //   setDocumentPreviews(previews);
  // };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-none border-0 sm:border sm:shadow-lg">
      {/* Dialog header usually provides the title, so this might be redundant if used in a Dialog */}
      {/* <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Car className="h-6 w-6 mr-2 text-primary" /> {t('addVehicleForm.title')}
        </CardTitle>
        <CardDescription>{t('addVehicleForm.description')}</CardDescription>
      </CardHeader> */}
      <CardContent className="pt-6 sm:pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addVehicleForm.make.label')}</FormLabel>
                  <FormControl><Input placeholder={t('addVehicleForm.make.placeholder')} {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addVehicleForm.model.label')}</FormLabel>
                  <FormControl><Input placeholder={t('addVehicleForm.model.placeholder')} {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addVehicleForm.year.label')}</FormLabel>
                  <FormControl><Input type="number" placeholder={t('addVehicleForm.year.placeholder')} {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addVehicleForm.registrationNumber.label')}</FormLabel>
                  <FormControl><Input placeholder={t('addVehicleForm.registrationNumber.placeholder')} {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {/* Document upload section - temporarily commented out for simplicity
            <FormField
              control={form.control}
              name="documents"
              render={() => (
                <FormItem>
                  <FormLabel>{t('addVehicleForm.documents.label')}</FormLabel>
                   <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <CardContent className="p-6 text-center">
                      <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <FormLabel htmlFor="vehicle-document-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                         {t('addVehicleForm.documents.uploadTrigger')}
                      </FormLabel>
                      <FormControl>
                        <Input id="vehicle-document-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleDocumentChange} disabled={isLoading} />
                      </FormControl>
                       <p className="text-xs text-muted-foreground mt-1">{t('addVehicleForm.documents.description')}</p>
                    </CardContent>
                  </Card>
                  {documentPreviews.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {t('addVehicleForm.documents.selectedLabel')}: {documentPreviews.join(", ")}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            */}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('addVehicleForm.submitButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    