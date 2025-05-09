"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Camera, FileUp, CheckCircle, ShieldQuestion, Car, FileTextIcon } from "lucide-react";
import Image from "next/image";

// Mock data for user's vehicles
const userVehicles = [
  { id: "v1", name: "Toyota IST (T123 ABC)" },
  { id: "v2", name: "Nissan March (T456 XYZ)" },
  { id: "v3", name: "Honda Fit (T789 DEF)" },
];

const claimSchemaStep1 = z.object({
  vehicleId: z.string().min(1, "Please select a vehicle"),
});

const claimSchemaStep2 = z.object({
  accidentDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
  accidentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
  accidentLocation: z.string().min(5, "Please provide a detailed location"),
  accidentDescription: z.string().min(20, "Please describe the accident in detail (min 20 characters)"),
});

const claimSchemaStep3 = z.object({
  photos: z.array(z.instanceof(File)).min(1, "At least one photo is required").max(5, "Maximum 5 photos allowed"),
});

const claimSchemaStep4 = z.object({
  documents: z.array(z.instanceof(File)).optional(),
});

const combinedSchema = claimSchemaStep1.merge(claimSchemaStep2).merge(claimSchemaStep3).merge(claimSchemaStep4);
type ClaimFormValues = z.infer<typeof combinedSchema>;

const steps = [
  { id: 1, title: "Select Vehicle", icon: Car, schema: claimSchemaStep1, fields: ['vehicleId'] as const },
  { id: 2, title: "Accident Details", icon: FileTextIcon, schema: claimSchemaStep2, fields: ['accidentDate', 'accidentTime', 'accidentLocation', 'accidentDescription'] as const },
  { id: 3, title: "Upload Photos", icon: Camera, schema: claimSchemaStep3, fields: ['photos'] as const },
  { id: 4, title: "Supporting Documents", icon: FileUp, schema: claimSchemaStep4, fields: ['documents'] as const },
  { id: 5, title: "Review & Submit", icon: CheckCircle, schema: z.object({}), fields: [] as const },
];

export function NewClaimWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(combinedSchema), // Resolve against the combined schema
    mode: "onChange", // Validate on change to enable next button
    defaultValues: {
      vehicleId: "",
      accidentDate: new Date().toISOString().split('T')[0], // Default to today
      accidentTime: new Date().toTimeString().substring(0,5), // Default to current time
      accidentLocation: "",
      accidentDescription: "",
      photos: [],
      documents: [],
    },
  });

  const watchedFiles = useWatch({ control: form.control, name: ["photos", "documents"] });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const handleNext = async () => {
    const currentStepSchema = steps[currentStep].schema;
    const currentStepFields = steps[currentStep].fields;
    
    // @ts-ignore
    const isValid = await form.trigger(currentStepFields);

    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        // Handle final submission
        onSubmit(form.getValues());
      }
    } else {
      // Manually validate and show errors if trigger doesn't catch all for current step
      const values = form.getValues();
      const result = currentStepSchema.safeParse(values);
      if (!result.success) {
        result.error.errors.forEach(err => {
          // @ts-ignore
          form.setError(err.path[0] as keyof ClaimFormValues, { type: "manual", message: err.message });
        });
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  function onSubmit(data: ClaimFormValues) {
    console.log("Claim Data:", data);
    // Here you would call the AI summarizeClaim flow if needed, then submit to backend
    // e.g. const summary = await summarizeClaim({ accidentDescription: data.accidentDescription, supportingDocuments: data.photos... })
    toast({
      title: "Claim Submitted Successfully!",
      description: "Your claim is now being processed. You can track its status in the Claims section.",
      variant: "default",
    });
    // Reset form or redirect, e.g., router.push('/claims');
    form.reset();
    setCurrentStep(0);
    setPhotoPreviews([]);
  }
  
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    form.setValue("photos", files, { shouldValidate: true });
    
    const previews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    form.setValue("documents", files, { shouldValidate: true });
  };

  const progressValue = ((currentStep + 1) / steps.length) * 100;
  const CurrentIcon = steps[currentStep].icon;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <CurrentIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
        </div>
        <CardDescription>
          Step {currentStep + 1} of {steps.length}. Please fill out the details accurately.
        </CardDescription>
        <Progress value={progressValue} className="w-full mt-2 h-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {currentStep === 0 && (
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vehicle Involved</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose your vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentStep === 1 && (
              <>
                <FormField control={form.control} name="accidentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Accident</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accidentTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time of Accident</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accidentLocation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location of Accident</FormLabel>
                    <FormControl><Input placeholder="e.g., Nyerere Rd, near Tazara junction" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="accidentDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the Accident</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="Explain what happened, damages, etc." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {currentStep === 2 && (
              <FormField
                control={form.control}
                name="photos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Accident Photos (max 5)</FormLabel>
                    <Card className="border-dashed border-2 hover:border-primary transition-colors">
                      <CardContent className="p-6 text-center">
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <FormLabel htmlFor="photo-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                          Click to upload or drag and drop
                        </FormLabel>
                        <FormControl>
                          <Input id="photo-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handlePhotoChange} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB each</p>
                      </CardContent>
                    </Card>
                    {photoPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photoPreviews.map((src, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                            <Image src={src} alt={`Preview ${index + 1}`} layout="fill" objectFit="cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentStep === 3 && (
               <FormField
                control={form.control}
                name="documents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Supporting Documents (Optional)</FormLabel>
                     <Card className="border-dashed border-2 hover:border-primary transition-colors">
                      <CardContent className="p-6 text-center">
                        <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <FormLabel htmlFor="document-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                           Click to upload or drag and drop
                        </FormLabel>
                        <FormControl>
                          <Input id="document-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleDocumentChange} />
                        </FormControl>
                         <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG, etc. up to 10MB each</p>
                      </CardContent>
                    </Card>
                    {watchedFiles[1] && watchedFiles[1].length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {watchedFiles[1].length} document(s) selected.
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Review Your Claim</h3>
                <div><strong>Vehicle:</strong> {userVehicles.find(v => v.id === form.getValues("vehicleId"))?.name}</div>
                <div><strong>Date & Time:</strong> {form.getValues("accidentDate")} at {form.getValues("accidentTime")}</div>
                <div><strong>Location:</strong> {form.getValues("accidentLocation")}</div>
                <div><strong>Description:</strong> {form.getValues("accidentDescription")}</div>
                <div><strong>Photos:</strong> {form.getValues("photos")?.length || 0} uploaded</div>
                <div><strong>Documents:</strong> {form.getValues("documents")?.length || 0} uploaded</div>
                <p className="text-sm text-muted-foreground">
                  Please ensure all information is correct before submitting.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {currentStep > 0 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
              <div className="flex-grow"></div> {/* Spacer */}
              <Button type="button" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {currentStep === steps.length - 1 ? "Submit Claim" : "Next"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
