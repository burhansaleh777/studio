
// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Camera as CameraIcon, FileUp, CheckCircle, Car, FileTextIcon, Mic, MicOff, StopCircle, Loader2, AlertTriangle, ArrowRight, LucideXCircle, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";


// Mock data for user's vehicles
const userVehicles = [
  { id: "v1", name: "Toyota IST (T123 ABC)", policyNumber: "BIMA-001" },
  { id: "v2", name: "Nissan March (T456 XYZ)", policyNumber: "BIMA-002" },
  { id: "v3", name: "Honda Fit (T789 DEF)", policyNumber: "BIMA-003" },
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

const MAX_PHOTOS = 4;

const photoInstructions = [
  { id: 'fullVehicle', titleKey: "newClaimWizard.photoInstructions.fullVehicle.title", descriptionKey: "newClaimWizard.photoInstructions.fullVehicle.description", isOptional: false },
  { id: 'damageCloseUp', titleKey: "newClaimWizard.photoInstructions.damageCloseUp.title", descriptionKey: "newClaimWizard.photoInstructions.damageCloseUp.description", isOptional: false },
  { id: 'surroundingArea', titleKey: "newClaimWizard.photoInstructions.surroundingArea.title", descriptionKey: "newClaimWizard.photoInstructions.surroundingArea.description", isOptional: false },
  { id: 'otherVehicles', titleKey: "newClaimWizard.photoInstructions.otherVehicles.title", descriptionKey: "newClaimWizard.photoInstructions.otherVehicles.description", isOptional: false },
];


const claimSchemaStep3 = z.object({
  photos: z.array(z.instanceof(File))
    .min(photoInstructions.filter(p => !p.isOptional).length, `Please upload at least ${photoInstructions.filter(p => !p.isOptional).length} photos covering all required types.`)
    .max(MAX_PHOTOS, `Maximum ${MAX_PHOTOS} photos allowed.`)
    .refine(files => {
        if (!files) return false;
        const uploadedInstructionIds = new Set(files.map(file => file.name.split('-')[0]));
        
        const allRequiredUploaded = photoInstructions
          .filter(p => !p.isOptional)
          .every(p => uploadedInstructionIds.has(p.id));
        
        return files.length >= photoInstructions.filter(p => !p.isOptional).length && allRequiredUploaded;
    }, (files) => {
        const allRequiredPhotoInstructions = photoInstructions.filter(p => !p.isOptional);
        const uploadedInstructionIds = new Set(files.map(file => file.name.split('-')[0]));
        const missingRequiredTitles = allRequiredPhotoInstructions
            .filter(p => !uploadedInstructionIds.has(p.id))
            .map(p => p.titleKey) // Will be translated later
            .join(', ');
        
        let message = `Please upload ${allRequiredPhotoInstructions.length} photos covering all required types. Missing: ${missingRequiredTitles}. Currently ${files?.length || 0} photos uploaded.`;
        
        return { message };
    })
});


const claimSchemaStep4 = z.object({
  documents: z.array(z.instanceof(File)).optional(),
});

const combinedSchema = claimSchemaStep1.merge(claimSchemaStep2).merge(claimSchemaStep3).merge(claimSchemaStep4);
type ClaimFormValues = z.infer<typeof combinedSchema>;

const stepsConfig = [
  { id: 1, titleKey: "newClaimWizard.steps.selectVehicle.title", icon: Car, schema: claimSchemaStep1, fields: ['vehicleId'] as const },
  { id: 2, titleKey: "newClaimWizard.steps.accidentDetails.title", icon: FileTextIcon, schema: claimSchemaStep2, fields: ['accidentDate', 'accidentTime', 'accidentLocation', 'accidentDescription'] as const },
  { id: 3, titleKey: "newClaimWizard.steps.uploadPhotos.title", icon: CameraIcon, schema: claimSchemaStep3, fields: ['photos'] as const },
  { id: 4, titleKey: "newClaimWizard.steps.supportingDocuments.title", icon: FileUp, schema: claimSchemaStep4, fields: ['documents'] as const },
  { id: 5, titleKey: "newClaimWizard.steps.reviewSubmit.title", icon: CheckCircle, schema: z.object({}), fields: [] as const },
];

interface StoredClaim {
  id: string;
  policyNumber: string;
  vehicle: string;
  dateSubmitted: string;
  status: "Under Review" | "Settled" | "Rejected";
  claimNumber: string;
  accidentDescription: string;
  accidentDate: string;
  accidentTime: string;
  accidentLocation: string;
  photoCount: number;
  documentCount: number;
}


export function NewClaimWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isAudioInputEnabled, setIsAudioInputEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  const [enableCamera, setEnableCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false); 
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const [committedPhotoPreviews, setCommittedPhotoPreviews] = useState<string[]>([]);

  const [currentPhotoInstructionIndex, setCurrentPhotoInstructionIndex] = useState(0);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);


  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(combinedSchema),
    mode: "onChange", 
    defaultValues: {
      vehicleId: "",
      accidentDate: new Date().toISOString().split('T')[0],
      accidentTime: new Date().toTimeString().substring(0,5),
      accidentLocation: "",
      accidentDescription: "",
      photos: [],
      documents: [],
    },
  });
  
  const watchedPhotos = form.watch("photos");
  const watchedDocuments = form.watch("documents");

  const translatedPhotoInstructions = photoInstructions.map(instr => ({
    ...instr,
    title: t(instr.titleKey),
    description: t(instr.descriptionKey)
  }));

  useEffect(() => {
    const currentFiles = watchedPhotos || [];
    const newPreviews = currentFiles
        .filter(file => file instanceof File)
        .map(file => URL.createObjectURL(file as File));
    
    committedPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setCommittedPhotoPreviews(newPreviews);

    return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPhotos]);


  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechApiAvailable(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // This could be dynamic based on app language context

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript.trim()) {
          const currentDescription = form.getValues("accidentDescription") || "";
          form.setValue("accidentDescription", (currentDescription + " " + finalTranscript.trim()).trim(), { shouldValidate: true });
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        let msgKey = "newClaimWizard.audioError.generic";
        if (event.error === 'no-speech') msgKey = "newClaimWizard.audioError.noSpeech";
        else if (event.error === 'audio-capture') msgKey = "newClaimWizard.audioError.micProblem";
        else if (event.error === 'not-allowed') {
          msgKey = "newClaimWizard.audioError.micDenied";
          setHasMicPermission(false);
        }
        toast({ variant: "destructive", title: t("newClaimWizard.audioError.title"), description: t(msgKey) });
      };
      recognition.onend = () => setIsRecording(false);
      speechRecognitionRef.current = recognition;
    } else {
      setSpeechApiAvailable(false);
    }
    return () => speechRecognitionRef.current?.stop();
  }, [form, toast, t]);

  const stopCurrentStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);


  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        toast({ variant: "destructive", title: t("newClaimWizard.cameraError.title"), description: t("newClaimWizard.cameraError.notSupported") });
        setCameraPermissionStatus('denied');
        return;
    }
    if (!videoRef.current) {
        toast({ variant: "destructive", title: t("newClaimWizard.cameraError.title"), description: t("newClaimWizard.cameraError.videoElementNotReady") });
        return;
    }

    setCameraPermissionStatus('pending');
    stopCurrentStream();

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });
        mediaStreamRef.current = newStream;

        if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            await new Promise<void>((resolve, reject) => {
              if(!videoRef.current) { 
                reject(new Error("Video element became null before metadata loaded."));
                return;
              }
              videoRef.current.onloadedmetadata = () => resolve();
              videoRef.current.onerror = reject; 
              if (videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                resolve();
              }
            });

            if(!videoRef.current) {
              throw new Error("Video element became null after metadata loaded but before play.");
            }
            await videoRef.current.play();
            setIsCameraActive(true);
            setCameraPermissionStatus('granted');
        }
    } catch (accessError) {
        console.error('Error accessing camera:', accessError);
        let descriptionKey = 'newClaimWizard.cameraError.couldNotAccess';
        if (accessError instanceof DOMException) {
            if (accessError.name === 'NotAllowedError' || accessError.name === 'PermissionDeniedError') {
                descriptionKey = 'newClaimWizard.cameraError.permissionDenied';
            } else if (accessError.name === 'NotFoundError' || accessError.name === 'DevicesNotFoundError') {
                descriptionKey = 'newClaimWizard.cameraError.noCameraFound';
            } else if (accessError.name === 'NotReadableError' || accessError.name === 'TrackStartError') {
                descriptionKey = 'newClaimWizard.cameraError.cameraInUse';
            }
        }
        toast({ variant: 'destructive', title: t('newClaimWizard.cameraError.accessErrorTitle'), description: t(descriptionKey, { errorName: (accessError as Error).name, errorMessage: (accessError as Error).message }) });
        setCameraPermissionStatus('denied');
        stopCurrentStream();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, facingMode, stopCurrentStream, t]); 

  useEffect(() => {
    if (enableCamera && currentStep === 2 && !capturedPhotoDataUrl) {
        startCamera();
    } else if (!enableCamera || currentStep !== 2 || capturedPhotoDataUrl) {
        stopCurrentStream();
         if (cameraPermissionStatus !== 'denied' && cameraPermissionStatus !== 'pending') {
             setCameraPermissionStatus('idle'); 
         }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableCamera, currentStep, capturedPhotoDataUrl, startCamera, stopCurrentStream]);


  useEffect(() => {
    if (currentStep !== 2 || !enableCamera) { 
      setCapturedPhotoDataUrl(null);
      setCurrentPhotoInstructionIndex(0);
    }
  }, [currentStep, enableCamera]);


  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ variant: "destructive", title: t("newClaimWizard.micError.title"), description: t("newClaimWizard.micError.notSupported") });
      setHasMicPermission(false); return false;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true); return true;
    } catch (err) {
      toast({ variant: "destructive", title: t("newClaimWizard.micError.accessDeniedTitle"), description: t("newClaimWizard.micError.accessDeniedDescription") });
      setHasMicPermission(false); return false;
    }
  };

  const handleMicButtonClick = async () => {
    if (!isAudioInputEnabled || !speechApiAvailable || !speechRecognitionRef.current) return;
    if (isRecording) {
      speechRecognitionRef.current.stop();
    } else {
      let permGranted = hasMicPermission;
      if (permGranted === null) permGranted = await requestMicrophonePermission();
      if (permGranted) speechRecognitionRef.current.start();
    }
  };

  const onAudioToggleChange = (checked: boolean) => {
    setIsAudioInputEnabled(checked);
    if (!checked && isRecording && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
  };

  const currentPhotoInstruction = translatedPhotoInstructions[currentPhotoInstructionIndex];
  
  const getCommittedPhotoCount = () => (form.getValues("photos") || []).length;
  const canTakeMorePhotosOverall = () => getCommittedPhotoCount() < MAX_PHOTOS;


  const addFilesToForm = (newFiles: File[]) => {
    const currentFiles: File[] = form.getValues("photos") || [];
    const availableSlots = MAX_PHOTOS - currentFiles.length;

    if (availableSlots <= 0) {
      toast({ variant: "destructive", title: t("newClaimWizard.photoError.limitReachedTitle"), description: t("newClaimWizard.photoError.limitReachedDescription", { maxPhotos: MAX_PHOTOS }) });
      return;
    }
    const filesToActuallyAdd = newFiles.slice(0, availableSlots);
    form.setValue("photos", [...currentFiles, ...filesToActuallyAdd], { shouldValidate: true, shouldDirty: true });
    if (filesToActuallyAdd.length < newFiles.length) {
      toast({ variant: "warning", title: t("newClaimWizard.photoError.limitReachedTitle"), description: t("newClaimWizard.photoError.someNotAdded", { countAdded: filesToActuallyAdd.length, countNotAdded: newFiles.length - filesToActuallyAdd.length }) });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) addFilesToForm(files);
  };
  
  const handleCaptureAndPreview = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !canTakeMorePhotosOverall() || isProcessingPhoto || !currentPhotoInstruction) {
        if(!isCameraActive && enableCamera) console.warn("Camera not active, cannot capture.");
        if(!canTakeMorePhotosOverall()) toast({variant: "warning", title: t("newClaimWizard.photoError.limitReachedTitle"), description: t("newClaimWizard.photoError.maxPhotos", {maxPhotos: MAX_PHOTOS})});
        return;
    }
    
    setIsProcessingPhoto(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
  
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height); 
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhotoDataUrl(dataUrl);
    }
    setIsProcessingPhoto(false);
  };

  const handleUsePhoto = async () => {
    if (!capturedPhotoDataUrl || !canTakeMorePhotosOverall() || !currentPhotoInstruction) return;
  
    setIsProcessingPhoto(true);
    try {
      const res = await fetch(capturedPhotoDataUrl);
      const blob = await res.blob();
      const fileName = `${currentPhotoInstruction.id}-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      addFilesToForm([file]);
      
      setCapturedPhotoDataUrl(null);

      const photosAfterAdd = getCommittedPhotoCount();
      if (photosAfterAdd >= MAX_PHOTOS) {
         toast({ title: t("newClaimWizard.photoMessages.limitReachedTitle"), description: t("newClaimWizard.photoMessages.limitReachedDescription", {maxPhotos: MAX_PHOTOS}) });
         setEnableCamera(false);
      } else if (currentPhotoInstructionIndex < translatedPhotoInstructions.length - 1) {
        setCurrentPhotoInstructionIndex(prev => prev + 1);
      } else {
        toast({ title: t("newClaimWizard.photoMessages.allTypesCapturedTitle"), description: t("newClaimWizard.photoMessages.allTypesCapturedDescription") });
        setEnableCamera(false);
      }
    } catch (error) {
      console.error("Error processing photo:", error);
      toast({ variant: "destructive", title: t("newClaimWizard.photoError.genericErrorTitle"), description: t("newClaimWizard.photoError.couldNotProcess") });
    } finally {
      setIsProcessingPhoto(false);
    }
  };
  
  const handleRetakePhoto = () => {
    setCapturedPhotoDataUrl(null);
  };

  const handleNextPhotoInstruction = () => {
    setCapturedPhotoDataUrl(null); 
    if (currentPhotoInstructionIndex < translatedPhotoInstructions.length - 1) {
      setCurrentPhotoInstructionIndex(prev => prev + 1);
    } else {
      toast({ title: t("newClaimWizard.photoMessages.finishedGuidedCaptureTitle"), description: t("newClaimWizard.photoMessages.finishedGuidedCaptureDescription")});
       setEnableCamera(false);
    }
  };

  const handleNext = async () => {
    const currentStepObj = stepsConfig[currentStep];
    const fieldsToValidate = currentStepObj.id === 3 ? ['photos'] : currentStepObj.fields;
    
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      if (currentStep < stepsConfig.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        onSubmit(form.getValues());
      }
    } else {
       const errors = form.formState.errors;
       let errorMessage = t("newClaimWizard.validationError.defaultMessage");
       
       if (currentStepObj.id === 3 && errors.photos) {
           if (typeof errors.photos.message === 'string') {
             errorMessage = errors.photos.message; // This message itself can be complex to translate if from Zod refine
           }
       } else if (fieldsToValidate && fieldsToValidate.length > 0) {
            const fieldErrorKeys = Object.keys(errors).filter(key => fieldsToValidate.includes(key as any));
            if (fieldErrorKeys.length > 0) {
                errorMessage = t("newClaimWizard.validationError.specificFields", {fields: fieldErrorKeys.join(', ')});
            }
       }
       toast({ variant: "destructive", title: t("newClaimWizard.validationError.title"), description: errorMessage });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  function onSubmit(data: ClaimFormValues) {
    const selectedVehicle = userVehicles.find(v => v.id === data.vehicleId);

    const newClaim: StoredClaim = {
      id: crypto.randomUUID(),
      policyNumber: selectedVehicle?.policyNumber || 'N/A',
      vehicle: selectedVehicle?.name || 'Unknown Vehicle',
      dateSubmitted: new Date().toISOString().split('T')[0],
      status: "Under Review",
      claimNumber: `CLM-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      accidentDescription: data.accidentDescription,
      accidentDate: data.accidentDate,
      accidentTime: data.accidentTime,
      accidentLocation: data.accidentLocation,
      photoCount: (data.photos || []).length,
      documentCount: (data.documents || []).length,
    };

    try {
      const existingClaimsString = localStorage.getItem("userClaims");
      const existingClaims: StoredClaim[] = existingClaimsString ? JSON.parse(existingClaimsString) : [];
      existingClaims.unshift(newClaim); // Add new claim to the beginning
      localStorage.setItem("userClaims", JSON.stringify(existingClaims));
      
      console.log("Claim Data Saved to localStorage:", newClaim);
      toast({
        title: t("newClaimWizard.submitSuccess.title"),
        description: t("newClaimWizard.submitSuccess.description", { claimNumber: newClaim.claimNumber }), 
        variant: "default",
      });

    } catch (error) {
      console.error("Failed to save claim to localStorage:", error);
      toast({
        title: t("newClaimWizard.submitError.title"),
        description: t("newClaimWizard.submitError.localStorageFailed"),
        variant: "destructive",
      });
    }
    
    form.reset();
    setCurrentStep(0);
    setCommittedPhotoPreviews([]); 
    if (speechRecognitionRef.current && isRecording) speechRecognitionRef.current.stop();
    setIsAudioInputEnabled(false);
    setEnableCamera(false); 
    setCurrentPhotoInstructionIndex(0);
    setCapturedPhotoDataUrl(null);
    stopCurrentStream();
  }
  
  const progressValue = ((currentStep + 1) / stepsConfig.length) * 100;
  const CurrentIcon = stepsConfig[currentStep].icon;
  
  let isEffectivelyAllGuidedInstructionsDone = currentPhotoInstructionIndex >= translatedPhotoInstructions.length;


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <CurrentIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{t(stepsConfig[currentStep].titleKey)}</CardTitle>
        </div>
        <CardDescription>{t('newClaimWizard.stepDescription', { currentStep: currentStep + 1, totalSteps: stepsConfig.length })}</CardDescription>
        <Progress value={progressValue} className="w-full mt-2 h-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {currentStep === 0 && (
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newClaimWizard.selectVehicle.label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder={t('newClaimWizard.selectVehicle.placeholder')} /></SelectTrigger></FormControl>
                    <SelectContent>{userVehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {currentStep === 1 && (
              <>
                <FormField control={form.control} name="accidentDate" render={({ field }) => (
                  <FormItem><FormLabel>{t('newClaimWizard.accidentDetails.dateLabel')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentTime" render={({ field }) => (
                  <FormItem><FormLabel>{t('newClaimWizard.accidentDetails.timeLabel')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentLocation" render={({ field }) => (
                  <FormItem><FormLabel>{t('newClaimWizard.accidentDetails.locationLabel')}</FormLabel><FormControl><Input placeholder={t('newClaimWizard.accidentDetails.locationPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentDescription" render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col space-y-1.5">
                       <FormLabel>{t('newClaimWizard.accidentDetails.descriptionLabel')}</FormLabel>
                       <div className="flex items-center space-x-2">
                         <Switch id="audio-toggle" checked={isAudioInputEnabled} onCheckedChange={onAudioToggleChange} disabled={!speechApiAvailable} aria-label={t('newClaimWizard.accidentDetails.audioInputToggleLabel')} />
                         <label htmlFor="audio-toggle" className="text-sm font-normal text-muted-foreground cursor-pointer">{t('newClaimWizard.accidentDetails.audioInputEnableText')}</label>
                         {isAudioInputEnabled && speechApiAvailable && (
                           <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild>
                             <Button type="button" variant="outline" size="icon" onClick={handleMicButtonClick} disabled={hasMicPermission === false}
                               className={cn("h-7 w-7", isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90", hasMicPermission === false && "text-muted-foreground cursor-not-allowed")}
                               aria-label={isRecording ? t('newClaimWizard.buttons.stopRecording') : (hasMicPermission === false ? t('newClaimWizard.buttons.micDenied') : t('newClaimWizard.buttons.startRecording'))}
                               >
                               {isRecording ? <StopCircle className="h-4 w-4" /> : (hasMicPermission === false ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />)}
                             </Button></TooltipTrigger><TooltipContent side="top"><p>{isRecording ? t('newClaimWizard.buttons.stopRecording') : (hasMicPermission === false ? t('newClaimWizard.buttons.micDenied') : t('newClaimWizard.buttons.startRecording'))}</p></TooltipContent></Tooltip></TooltipProvider>
                         )}
                       </div>
                       {!speechApiAvailable && <p className="text-xs text-destructive">{t('newClaimWizard.audioError.notSupported')}</p>}
                       {isAudioInputEnabled && isRecording && <p className="text-xs text-primary animate-pulse">{t('newClaimWizard.accidentDetails.recordingInProgress')}</p>}
                     </div>
                    <FormControl><Textarea rows={4} placeholder={t('newClaimWizard.accidentDetails.descriptionPlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {currentStep === 2 && (() => {
              const currentPhotoCount = getCommittedPhotoCount();
              const maxPhotoCount = MAX_PHOTOS;
              return (
                <FormField control={form.control} name="photos" render={() => ( 
                  <FormItem>
                    <FormLabel>
                        {t('newClaimWizard.uploadPhotos.title')}
                        {` (${currentPhotoCount}/${maxPhotoCount})`}
                    </FormLabel>
                    <div className="flex items-center space-x-2 mb-3">
                      <Switch id="camera-toggle" checked={enableCamera} onCheckedChange={setEnableCamera} aria-label={t('newClaimWizard.uploadPhotos.cameraToggleLabel')} />
                      <label htmlFor="camera-toggle" className="text-sm font-medium text-foreground">{t('newClaimWizard.uploadPhotos.useCameraLabel')}</label>
                    </div>

                    {enableCamera && currentPhotoInstruction && !isEffectivelyAllGuidedInstructionsDone && (
                      <Card className="mb-4 p-3 bg-primary/5 border-primary/20">
                        <CardTitle className="text-md mb-1">{currentPhotoInstruction.title}</CardTitle>
                        <CardDescription className="text-sm">{currentPhotoInstruction.description}</CardDescription>
                      </Card>
                    )}
                    
                    {enableCamera && (
                      <Card className="p-4 mb-3 bg-muted/30">
                        {!capturedPhotoDataUrl ? (
                          <>
                            <div className="relative w-full aspect-video rounded-md bg-black mb-2 overflow-hidden">
                               <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                               {cameraPermissionStatus === 'pending' && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><Loader2 className="h-8 w-8 animate-spin text-primary" /><AlertDescription className="mt-2">{t('newClaimWizard.cameraMessages.initializing')}</AlertDescription></Alert>}
                               {cameraPermissionStatus === 'denied' && <Alert variant="destructive" className="absolute inset-0 m-auto max-w-sm max-h-40 flex flex-col items-center justify-center"><AlertTriangle className="h-5 w-5 mb-1" /><AlertTitle className="text-sm">{t('newClaimWizard.cameraError.accessDeniedTitle')}</AlertTitle><AlertDescription className="text-xs text-center">{t('newClaimWizard.cameraError.permissionDenied')}</AlertDescription></Alert>}
                               {cameraPermissionStatus === 'granted' && !isCameraActive && videoRef.current && videoRef.current.srcObject && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><Loader2 className="h-8 w-8 animate-spin text-primary" /><AlertDescription className="mt-2">{t('newClaimWizard.cameraMessages.starting')}</AlertDescription></Alert>}
                               {cameraPermissionStatus === 'granted' && isCameraActive && videoRef.current && !videoRef.current?.videoWidth && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><AlertDescription>{t('newClaimWizard.cameraMessages.feedLoading')}</AlertDescription></Alert>}
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {isCameraActive && cameraPermissionStatus === 'granted' && currentPhotoInstruction && !isEffectivelyAllGuidedInstructionsDone && (
                                  <Button type="button" onClick={handleCaptureAndPreview} className="flex-1 min-w-[120px]" disabled={isProcessingPhoto || !canTakeMorePhotosOverall()}>
                                  {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CameraIcon className="mr-2 h-4 w-4" />}
                                  {t('newClaimWizard.buttons.capturePhoto')}
                                  </Button>
                              )}
                            </div>

                            {currentPhotoInstruction && (currentPhotoInstruction.isOptional || currentPhotoInstructionIndex >= translatedPhotoInstructions.filter(p=>!p.isOptional).length) && !isEffectivelyAllGuidedInstructionsDone && isCameraActive && cameraPermissionStatus === 'granted' && (
                               <Button type="button" variant="outline" onClick={handleNextPhotoInstruction} className="w-full mt-2">
                                  {t('newClaimWizard.buttons.skipPhoto', { photoTitle: currentPhotoInstruction.title })}
                                  <ArrowRight className="ml-2 h-4 w-4"/>
                              </Button>
                            )}
                          </>
                        ) : ( 
                          <div className="text-center">
                             <p className="text-sm font-medium mb-2">{t('newClaimWizard.uploadPhotos.previewTitle', { photoTitle: currentPhotoInstruction?.title })}</p>
                            <Image src={capturedPhotoDataUrl} alt={t('newClaimWizard.uploadPhotos.previewAlt', { photoTitle: currentPhotoInstruction?.title })} width={320} height={240} className="rounded-md mx-auto mb-3 max-w-full h-auto object-contain border" />
                            <div className="flex justify-center gap-3">
                              <Button type="button" onClick={handleUsePhoto} className="bg-green-600 hover:bg-green-700 text-white" disabled={isProcessingPhoto || !canTakeMorePhotosOverall()}>
                                {isProcessingPhoto && form.getValues("photos").find(p=>p.name.startsWith(currentPhotoInstruction?.id || '')) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                {t('newClaimWizard.buttons.usePhoto')}
                              </Button>
                              <Button type="button" variant="outline" onClick={handleRetakePhoto} disabled={isProcessingPhoto}>
                                <CameraIcon className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.retakePhoto')}
                              </Button>
                            </div>
                          </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                         {!canTakeMorePhotosOverall() && getCommittedPhotoCount() >= MAX_PHOTOS && <Alert variant="warning" className="mt-3"><AlertTriangle className="h-4 w-4" /><AlertTitle>{t('newClaimWizard.photoError.limitReachedTitle')}</AlertTitle><AlertDescription>{t('newClaimWizard.photoError.maxPhotos', {maxPhotos: MAX_PHOTOS})}</AlertDescription></Alert>}
                         {isEffectivelyAllGuidedInstructionsDone && enableCamera && <Alert className="mt-3"><CheckCircle className="h-4 w-4"/><AlertTitle>{t('newClaimWizard.photoMessages.guidedCaptureCompleteTitle')}</AlertTitle><AlertDescription>{t('newClaimWizard.photoMessages.guidedCaptureCompleteDescription')}</AlertDescription></Alert>}
                      </Card>
                    )}
                    
                    <Card className="border-dashed border-2 hover:border-primary transition-colors">
                      <CardContent className="p-6 text-center">
                        <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <FormLabel htmlFor="photo-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                          {t('newClaimWizard.uploadPhotos.uploadLabel')}
                        </FormLabel>
                        <FormControl>
                          <Input id="photo-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleFileUpload} disabled={!canTakeMorePhotosOverall()} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">{t('newClaimWizard.uploadPhotos.fileTypesAndSize', { maxPhotos: MAX_PHOTOS})}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                           {t('newClaimWizard.uploadPhotos.requiredPhotosIntro')}: {translatedPhotoInstructions.filter(p => !p.isOptional).map(p => p.title).join(', ')}.
                        </p>
                      </CardContent>
                    </Card>
                    {committedPhotoPreviews.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">{t('newClaimWizard.uploadPhotos.uploadedPhotosTitle')}:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {committedPhotoPreviews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-md overflow-hidden border shadow">
                              <Image src={src} alt={t('newClaimWizard.uploadPhotos.previewIndexedAlt', { index: index + 1 })} layout="fill" objectFit="cover" />
                               <Button 
                                  type="button" 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100"
                                  onClick={() => {
                                    const currentPhotos = form.getValues("photos") || [];
                                    const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
                                    form.setValue("photos", updatedPhotos, { shouldValidate: true, shouldDirty: true });
                                  }}
                                  aria-label={t('newClaimWizard.buttons.removePhoto')}
                                >
                                  <LucideXCircle className="h-4 w-4" />
                                </Button>
                              <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                  { (watchedPhotos[index]?.name.split('-')[0] && translatedPhotoInstructions.find(instr => instr.id === watchedPhotos[index]?.name.split('-')[0])?.title) || t('newClaimWizard.uploadPhotos.photoIndexed', { index: index + 1 })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage className="mt-2" /> 
                  </FormItem>
                )} />
              )
            })()}

            {currentStep === 3 && ( 
               <FormField control={form.control} name="documents" render={() => ( 
                <FormItem>
                  <FormLabel>{t('newClaimWizard.supportingDocuments.title')}</FormLabel>
                   <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <CardContent className="p-6 text-center">
                      <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <FormLabel htmlFor="document-upload" className="text-primary font-semibold cursor-pointer hover:underline">{t('newClaimWizard.supportingDocuments.uploadLabel')}</FormLabel>
                      <FormControl><Input id="document-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg" multiple 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const currentDocs = form.getValues("documents") || [];
                          form.setValue("documents", [...currentDocs, ...files], {shouldValidate: true, shouldDirty: true});
                        }}
                      /></FormControl>
                       <p className="text-xs text-muted-foreground mt-1">{t('newClaimWizard.supportingDocuments.fileTypes')}</p>
                    </CardContent>
                  </Card>
                  {watchedDocuments && watchedDocuments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">{t('newClaimWizard.supportingDocuments.selectedDocsTitle')}:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {watchedDocuments.map((doc, index) => (
                          <li key={index} className="flex justify-between items-center">
                            <span>{doc.name} ({(doc.size / 1024).toFixed(1)} KB)</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-destructive"
                              onClick={() => {
                                const updatedDocs = watchedDocuments.filter((_, i) => i !== index);
                                form.setValue("documents", updatedDocs, {shouldValidate:true, shouldDirty: true});
                              }}
                              aria-label={t('newClaimWizard.buttons.removeDocument')}
                            >
                              <LucideXCircle className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {currentStep === 4 && ( 
              <div className="space-y-3 p-2 rounded-md border bg-muted/20">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{t('newClaimWizard.reviewSubmit.title')}</h3>
                <ReviewItem label={t('newClaimWizard.reviewSubmit.vehicleLabel')} value={userVehicles.find(v => v.id === form.getValues("vehicleId"))?.name || 'N/A'} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.dateTimeLabel')} value={`${form.getValues("accidentDate")} ${t('newClaimWizard.reviewSubmit.atTimeConnector')} ${form.getValues("accidentTime")}`} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.locationLabel')} value={form.getValues("accidentLocation")} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.descriptionLabel')} value={form.getValues("accidentDescription")} preWrap />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.photosUploadedLabel')} value={`${form.getValues("photos")?.length || 0}`} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.documentsUploadedLabel')} value={`${form.getValues("documents")?.length || 0}`} />
                <p className="text-sm text-muted-foreground pt-3">{t('newClaimWizard.reviewSubmit.finalCheckMessage')}</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {currentStep > 0 && <Button type="button" variant="outline" onClick={handleBack}>{t('newClaimWizard.buttons.back')}</Button>}
              <div className="flex-grow"></div> {/* Spacer */}
              <Button type="button" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {currentStep === stepsConfig.length - 1 ? t('newClaimWizard.buttons.submit') : t('newClaimWizard.buttons.next')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ReviewItem({ label, value, preWrap = false }: { label: string; value: string | number; preWrap?: boolean}) {
  const { t } = useLanguage(); 
  return (
    <div className="flex flex-col sm:flex-row py-1">
      <strong className="w-full sm:w-1/3 text-sm text-muted-foreground">{label}:</strong>
      <span className={`w-full sm:w-2/3 text-sm ${preWrap ? 'whitespace-pre-wrap break-words' : ''}`}>{value || t('common.notApplicableShort')}</span>
    </div>
  );
}

    

    