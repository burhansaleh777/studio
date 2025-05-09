"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Car } from "lucide-react";
import React from 'react';

const vehicleSchema = z.object({
  make: z.string().min(1, "Vehicle make is required (e.g., Toyota)"),
  model: z.string().min(1, "Vehicle model is required (e.g., Corolla)"),
  year: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(1900, "Year must be after 1900").max(new Date().getFullYear() + 1, `Year cannot be after ${new Date().getFullYear() + 1}`)
  ),
  registrationNumber: z.string().min(1, "Registration plate number is required"),
  documents: z.array(z.instanceof(File)).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface AddVehicleFormProps {
  onVehicleAdded?: () => void; // Callback after successful addition
}

export function AddVehicleForm({ onVehicleAdded }: AddVehicleFormProps) {
  const { toast } = useToast();
  const [documentPreviews, setDocumentPreviews] = React.useState<string[]>([]);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      registrationNumber: "",
      documents: [],
    },
  });

  function onSubmit(data: VehicleFormValues) {
    console.log("Vehicle Data:", data);
    toast({
      title: "Vehicle Added Successfully!",
      description: `${data.make} ${data.model} has been added to your profile.`,
    });
    form.reset();
    setDocumentPreviews([]);
    if (onVehicleAdded) {
      onVehicleAdded();
    }
  }
  
  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    form.setValue("documents", files, { shouldValidate: true });
    
    const previews = files.map(file => file.name); // Just show names for documents
    setDocumentPreviews(previews);
  };


  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Car className="h-6 w-6 mr-2 text-primary" /> Add New Vehicle
        </CardTitle>
        <CardDescription>Enter the details of your vehicle.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl><Input placeholder="e.g., Toyota" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl><Input placeholder="e.g., IST" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year of Manufacture</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 2010" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl><Input placeholder="e.g., T123 ABC" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="documents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload Vehicle Documents (Optional)</FormLabel>
                   <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <CardContent className="p-6 text-center">
                      <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <FormLabel htmlFor="vehicle-document-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                         Click to upload or drag and drop
                      </FormLabel>
                      <FormControl>
                        <Input id="vehicle-document-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleDocumentChange} />
                      </FormControl>
                       <p className="text-xs text-muted-foreground mt-1">Registration card, Logbook, etc.</p>
                    </CardContent>
                  </Card>
                  {documentPreviews.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Selected: {documentPreviews.join(", ")}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Add Vehicle
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
