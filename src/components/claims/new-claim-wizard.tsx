
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

const MAX_PHOTOS = 4;

const photoInstructions = [
  { id: 'fullVehicle', title: "Full Vehicle Photo", description: "Capture a clear photo of the entire vehicle.", isOptional: false },
  { id: 'damageCloseUp', title: "Damage Close-up Photo", description: "Take a close-up photo of the damaged section(s).", isOptional: false },
  { id: 'surroundingArea', title: "Surrounding Area Photo", description: "Capture the area around the vehicle where the accident occurred.", isOptional: false },
  { id: 'otherVehicles', title: "Other Vehicles Photo", description: "If other vehicles were involved, take photos of them as well.", isOptional: false }, // Changed to non-optional for 4 photo requirement.
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
            .map(p => p.title)
            .join(', ');
        
        let message = `Please upload ${allRequiredPhotoInstructions.length} photos covering all required types: ${allRequiredPhotoInstructions.map(p => p.title).join(', ')}. Currently ${files?.length || 0} photos uploaded.`;
        if (missingRequiredTitles) {
            message += ` Missing: ${missingRequiredTitles}.`;
        }
        return { message };
    })
});


const claimSchemaStep4 = z.object({
  documents: z.array(z.instanceof(File)).optional(),
});

const combinedSchema = claimSchemaStep1.merge(claimSchemaStep2).merge(claimSchemaStep3).merge(claimSchemaStep4);
type ClaimFormValues = z.infer<typeof combinedSchema>;

const steps = [
  { id: 1, title: "Select Vehicle", icon: Car, schema: claimSchemaStep1, fields: ['vehicleId'] as const },
  { id: 2, title: "Accident Details", icon: FileTextIcon, schema: claimSchemaStep2, fields: ['accidentDate', 'accidentTime', 'accidentLocation', 'accidentDescription'] as const },
  { id: 3, title: "Upload Photos", icon: CameraIcon, schema: claimSchemaStep3, fields: ['photos'] as const },
  { id: 4, title: "Supporting Documents", icon: FileUp, schema: claimSchemaStep4, fields: ['documents'] as const },
  { id: 5, title: "Review & Submit", icon: CheckCircle, schema: z.object({}), fields: [] as const },
];


export function NewClaimWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  // Audio Input State
  const [isAudioInputEnabled, setIsAudioInputEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Camera Input State
  const [enableCamera, setEnableCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false); 
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const [committedPhotoPreviews, setCommittedPhotoPreviews] = useState<string[]>([]);

  // Guided Photo Capture State
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
      recognition.lang = 'en-US';

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
        let msg = "Speech recognition error.";
        if (event.error === 'no-speech') msg = "No speech detected.";
        else if (event.error === 'audio-capture') msg = "Microphone problem.";
        else if (event.error === 'not-allowed') {
          msg = "Microphone access denied.";
          setHasMicPermission(false);
        }
        toast({ variant: "destructive", title: "Audio Error", description: msg });
      };
      recognition.onend = () => setIsRecording(false);
      speechRecognitionRef.current = recognition;
    } else {
      setSpeechApiAvailable(false);
    }
    return () => speechRecognitionRef.current?.stop();
  }, [form, toast]);

  const stopCurrentStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false); // Ensure camera is marked as inactive
  }, []);


  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        toast({ variant: "destructive", title: "Camera Error", description: "Camera not supported by your browser." });
        setCameraPermissionStatus('denied');
        return;
    }
    if (!videoRef.current) {
        toast({ variant: "destructive", title: "Camera Error", description: "Video element not ready." });
        return;
    }

    setCameraPermissionStatus('pending');
    stopCurrentStream(); // Always stop existing stream before starting a new one

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
            // Use a promise for onloadedmetadata to ensure it plays after metadata is loaded
            await new Promise<void>((resolve, reject) => { // Changed to Promise<void>
              if(!videoRef.current) { 
                reject(new Error("Video element became null before metadata loaded."));
                return;
              }
              videoRef.current.onloadedmetadata = () => resolve(); // Resolve with no value
              videoRef.current.onerror = reject; 
              if (videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
                resolve(); // Already loaded
              }
            });

            if(!videoRef.current) {
              throw new Error("Video element became null after metadata loaded but before play.");
            }
            await videoRef.current.play();
            setIsCameraActive(true); // Moved here to ensure it's set after play()
            setCameraPermissionStatus('granted');
        }
    } catch (accessError) {
        console.error('Error accessing camera:', accessError);
        let description = 'Could not access camera.';
        if (accessError instanceof DOMException) {
            description = `${accessError.name}: ${accessError.message}`;
            if (accessError.name === 'NotAllowedError' || accessError.name === 'PermissionDeniedError') {
                description = 'Camera permission denied. Please enable it in browser settings.';
            } else if (accessError.name === 'NotFoundError' || accessError.name === 'DevicesNotFoundError') {
                description = 'No camera found. Ensure a camera is connected and enabled.';
            } else if (accessError.name === 'NotReadableError' || accessError.name === 'TrackStartError') {
                description = 'Camera is in use or busy. Try closing other apps using the camera.';
            }
        } else if (accessError instanceof Error) {
            description = accessError.message;
        }
        toast({ variant: 'destructive', title: 'Camera Access Error', description });
        setCameraPermissionStatus('denied');
        stopCurrentStream(); // Ensure stream is stopped on error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, facingMode, stopCurrentStream]); 

  useEffect(() => {
    if (enableCamera && currentStep === 2 && !capturedPhotoDataUrl) { // Only start if no photo is being previewed
        startCamera();
    } else if (!enableCamera || currentStep !== 2 || capturedPhotoDataUrl) { // Stop if camera disabled, wrong step, or photo preview
        stopCurrentStream();
         if (cameraPermissionStatus !== 'denied' && cameraPermissionStatus !== 'pending') { // Avoid resetting if denied or pending
             setCameraPermissionStatus('idle'); 
         }
    }
    // No return cleanup needed here as stopCurrentStream is called when conditions change.
    // Cleanup for unmount is handled by the main component unmount useEffect for speechRec.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableCamera, currentStep, capturedPhotoDataUrl, startCamera, stopCurrentStream]); // Added startCamera, stopCurrentStream


  useEffect(() => {
    // This effect specifically handles resetting the photo preview and instruction index
    // when moving away from the photo step or disabling the camera.
    if (currentStep !== 2 || !enableCamera) { 
      setCapturedPhotoDataUrl(null);
      setCurrentPhotoInstructionIndex(0); // Reset instruction index
    }
  }, [currentStep, enableCamera]);


  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ variant: "destructive", title: "Mic Access Error", description: "Mic access not supported by browser." });
      setHasMicPermission(false); return false;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true); return true;
    } catch (err) {
      toast({ variant: "destructive", title: "Mic Access Denied", description: "Enable microphone permissions." });
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

  const currentPhotoInstruction = photoInstructions[currentPhotoInstructionIndex];
  const totalCommittedPhotos = (form.getValues("photos") || []).length;
  const canTakeMorePhotosOverall = totalCommittedPhotos < MAX_PHOTOS;

  const addFilesToForm = (newFiles: File[]) => {
    const currentFiles: File[] = form.getValues("photos") || [];
    const availableSlots = MAX_PHOTOS - currentFiles.length;

    if (availableSlots <= 0) {
      toast({ variant: "destructive", title: "Photo Limit Reached", description: `Maximum ${MAX_PHOTOS} photos already uploaded.` });
      return;
    }
    const filesToActuallyAdd = newFiles.slice(0, availableSlots);
    form.setValue("photos", [...currentFiles, ...filesToActuallyAdd], { shouldValidate: true, shouldDirty: true });
    if (filesToActuallyAdd.length < newFiles.length) {
      toast({ variant: "warning", title: "Photo Limit Reached", description: `${filesToActuallyAdd.length} photo(s) added. ${newFiles.length - filesToActuallyAdd.length} not added.`});
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) addFilesToForm(files);
  };
  
  const handleCaptureAndPreview = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive || !canTakeMorePhotosOverall || isProcessingPhoto || !currentPhotoInstruction) {
        if(!isCameraActive && enableCamera) console.warn("Camera not active, cannot capture.");
        if(!canTakeMorePhotosOverall) toast({variant: "warning", title:"Limit Reached", description: `Max ${MAX_PHOTOS} photos.`});
        return;
    }
    
    setIsProcessingPhoto(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure canvas matches video's current dimensions
    // These might change if the stream restarts or device orientation changes
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
  
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height); 
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhotoDataUrl(dataUrl);
      // Do not stop stream here, user might want to retake
    }
    setIsProcessingPhoto(false);
  };

  const handleUsePhoto = async () => {
    if (!capturedPhotoDataUrl || !canTakeMorePhotosOverall || !currentPhotoInstruction) return;
  
    setIsProcessingPhoto(true);
    try {
      const res = await fetch(capturedPhotoDataUrl);
      const blob = await res.blob();
      // Ensure unique file name if multiple photos are taken for the same instruction type (though current logic moves to next instruction)
      const fileName = `${currentPhotoInstruction.id}-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      addFilesToForm([file]);
      
      setCapturedPhotoDataUrl(null); // Clear preview to re-enable camera for next shot

      const photosAfterAdd = (form.getValues("photos") || []).length;
      if (photosAfterAdd >= MAX_PHOTOS) {
         toast({ title: "Photo Limit Reached", description: `You've reached the maximum of ${MAX_PHOTOS} photos.` });
         setEnableCamera(false); // Optionally disable camera if limit reached
      } else if (currentPhotoInstructionIndex < photoInstructions.length - 1) {
        setCurrentPhotoInstructionIndex(prev => prev + 1);
      } else {
        toast({ title: "All Photo Types Captured", description: "You can proceed or upload more manually if space allows." });
        setEnableCamera(false); // All guided photos taken
      }
    } catch (error) {
      console.error("Error processing photo:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not process the captured photo." });
    } finally {
      setIsProcessingPhoto(false);
      // Camera will restart via useEffect if conditions are met (enableCamera, currentStep, !capturedPhotoDataUrl)
    }
  };
  
  const handleRetakePhoto = () => {
    setCapturedPhotoDataUrl(null); // Clear preview, camera will restart via useEffect
  };

  const handleNextPhotoInstruction = () => { // Used for skipping optional photos
    setCapturedPhotoDataUrl(null); 
    if (currentPhotoInstructionIndex < photoInstructions.length - 1) {
      setCurrentPhotoInstructionIndex(prev => prev + 1);
    } else {
      toast({ title: "Finished with guided capture.", description: "You can proceed to the next step if requirements are met."});
       setEnableCamera(false); // No more instructions
    }
  };

  const handleNext = async () => {
    const currentStepObj = steps[currentStep];
    const fieldsToValidate = currentStepObj.id === 3 ? ['photos'] : currentStepObj.fields;
    
    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        onSubmit(form.getValues());
      }
    } else {
       const errors = form.formState.errors;
       let errorMessage = "Please correct the errors before proceeding.";
       
       if (currentStepObj.id === 3 && errors.photos) {
           if (typeof errors.photos.message === 'string') {
             errorMessage = errors.photos.message;
           } else if (Array.isArray(errors.photos) && errors.photos[0] && typeof errors.photos[0].message === 'string') {
             // Handle array of errors if Zod returns that for array fields
             errorMessage = errors.photos[0].message;
           }
       } else if (fieldsToValidate && fieldsToValidate.length > 0) {
            const fieldErrorKeys = Object.keys(errors).filter(key => fieldsToValidate.includes(key as any));
            if (fieldErrorKeys.length > 0) {
                errorMessage = `Please correct errors in: ${fieldErrorKeys.join(', ')}.`;
            }
       }
       toast({ variant: "destructive", title: "Validation Error", description: errorMessage });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  function onSubmit(data: ClaimFormValues) {
    console.log("Claim Data:", data); 
    toast({
      title: "Claim Submitted Successfully!",
      description: "Your claim is now being processed.", variant: "default",
    });
    form.reset();
    setCurrentStep(0);
    setCommittedPhotoPreviews([]); 
    if (speechRecognitionRef.current && isRecording) speechRecognitionRef.current.stop();
    setIsAudioInputEnabled(false);
    setEnableCamera(false); 
    setCurrentPhotoInstructionIndex(0);
    setCapturedPhotoDataUrl(null);
    stopCurrentStream(); // Ensure camera is off after submission
  }
  
  const progressValue = ((currentStep + 1) / steps.length) * 100;
  const CurrentIcon = steps[currentStep].icon;
  
  let isEffectivelyAllGuidedInstructionsDone = currentPhotoInstructionIndex >= photoInstructions.length;


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <CurrentIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
        </div>
        <CardDescription>Step {currentStep + 1} of {steps.length}. Fill accurately.</CardDescription>
        <Progress value={progressValue} className="w-full mt-2 h-2" />
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {currentStep === 0 && (
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle Involved</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choose your vehicle" /></SelectTrigger></FormControl>
                    <SelectContent>{userVehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {currentStep === 1 && (
              <>
                <FormField control={form.control} name="accidentDate" render={({ field }) => (
                  <FormItem><FormLabel>Date of Accident</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentTime" render={({ field }) => (
                  <FormItem><FormLabel>Time of Accident</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentLocation" render={({ field }) => (
                  <FormItem><FormLabel>Location of Accident</FormLabel><FormControl><Input placeholder="e.g., Nyerere Rd, near Tazara" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="accidentDescription" render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col space-y-1.5">
                       <FormLabel>Describe the Accident</FormLabel>
                       <div className="flex items-center space-x-2">
                         <Switch id="audio-toggle" checked={isAudioInputEnabled} onCheckedChange={onAudioToggleChange} disabled={!speechApiAvailable} />
                         <label htmlFor="audio-toggle" className="text-sm font-normal text-muted-foreground cursor-pointer">Enable Audio Input</label>
                         {isAudioInputEnabled && speechApiAvailable && (
                           <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild>
                             <Button type="button" variant="outline" size="icon" onClick={handleMicButtonClick} disabled={hasMicPermission === false}
                               className={cn("h-7 w-7", isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90", hasMicPermission === false && "text-muted-foreground cursor-not-allowed")}>
                               {isRecording ? <StopCircle className="h-4 w-4" /> : (hasMicPermission === false ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />)}
                               <span className="sr-only">{isRecording ? "Stop" : (hasMicPermission === false ? "Mic denied" : "Record")}</span>
                             </Button></TooltipTrigger><TooltipContent side="top"><p>{isRecording ? "Stop" : (hasMicPermission === false ? "Mic denied" : "Record")}</p></TooltipContent></Tooltip></TooltipProvider>
                         )}
                       </div>
                       {!speechApiAvailable && <p className="text-xs text-destructive">Audio input not supported.</p>}
                       {isAudioInputEnabled && isRecording && <p className="text-xs text-primary animate-pulse">Recording...</p>}
                     </div>
                    <FormControl><Textarea rows={4} placeholder="Explain what happened..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {currentStep === 2 && ( 
              <FormField control={form.control} name="photos" render={() => ( 
                <FormItem>
                  <FormLabel>Upload Accident Photos ({totalCommittedPhotos} / {MAX_PHOTOS})</FormLabel>
                  <div className="flex items-center space-x-2 mb-3">
                    <Switch id="camera-toggle" checked={enableCamera} onCheckedChange={setEnableCamera} />
                    <label htmlFor="camera-toggle" className="text-sm font-medium text-foreground">Use Camera for Guided Capture</label>
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
                             {cameraPermissionStatus === 'pending' && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><Loader2 className="h-8 w-8 animate-spin text-primary" /><AlertDescription className="mt-2">Initializing camera...</AlertDescription></Alert>}
                             {cameraPermissionStatus === 'denied' && <Alert variant="destructive" className="absolute inset-0 m-auto max-w-sm max-h-40 flex flex-col items-center justify-center"><AlertTriangle className="h-5 w-5 mb-1" /><AlertTitle className="text-sm">Camera Access Denied</AlertTitle><AlertDescription className="text-xs text-center">Please enable camera permissions in your browser settings.</AlertDescription></Alert>}
                             {cameraPermissionStatus === 'granted' && !isCameraActive && videoRef.current && videoRef.current.srcObject && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><Loader2 className="h-8 w-8 animate-spin text-primary" /><AlertDescription className="mt-2">Starting camera...</AlertDescription></Alert>}
                             {cameraPermissionStatus === 'granted' && isCameraActive && videoRef.current && !videoRef.current?.videoWidth && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><AlertDescription>Camera feed loading...</AlertDescription></Alert>}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {isCameraActive && cameraPermissionStatus === 'granted' && currentPhotoInstruction && !isEffectivelyAllGuidedInstructionsDone && (
                                <Button type="button" onClick={handleCaptureAndPreview} className="flex-1 min-w-[120px]" disabled={isProcessingPhoto || !canTakeMorePhotosOverall}>
                                {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CameraIcon className="mr-2 h-4 w-4" />}
                                Capture
                                </Button>
                            )}
                          </div>

                          {currentPhotoInstruction && (currentPhotoInstruction.isOptional || currentPhotoInstructionIndex >= photoInstructions.filter(p=>!p.isOptional).length) && !isEffectivelyAllGuidedInstructionsDone && isCameraActive && cameraPermissionStatus === 'granted' && (
                             <Button type="button" variant="outline" onClick={handleNextPhotoInstruction} className="w-full mt-2">
                                Skip '{currentPhotoInstruction.title}'
                                <ArrowRight className="ml-2 h-4 w-4"/>
                            </Button>
                          )}
                        </>
                      ) : ( 
                        <div className="text-center">
                           <p className="text-sm font-medium mb-2">Preview: {currentPhotoInstruction?.title}</p>
                          <Image src={capturedPhotoDataUrl} alt={`Preview for ${currentPhotoInstruction?.title}`} width={320} height={240} className="rounded-md mx-auto mb-3 max-w-full h-auto object-contain border" />
                          <div className="flex justify-center gap-3">
                            <Button type="button" onClick={handleUsePhoto} className="bg-green-600 hover:bg-green-700 text-white" disabled={isProcessingPhoto || !canTakeMorePhotosOverall}>
                              {isProcessingPhoto && form.getValues("photos").find(p=>p.name.startsWith(currentPhotoInstruction?.id || '')) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                              Use Photo
                            </Button>
                            <Button type="button" variant="outline" onClick={handleRetakePhoto} disabled={isProcessingPhoto}>
                              <CameraIcon className="mr-2 h-4 w-4" /> Retake Photo
                            </Button>
                          </div>
                        </div>
                      )}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                       {!canTakeMorePhotosOverall && totalCommittedPhotos >= MAX_PHOTOS && <Alert variant="warning" className="mt-3"><AlertTriangle className="h-4 w-4" /><AlertTitle>Photo Limit Reached</AlertTitle><AlertDescription>Maximum {MAX_PHOTOS} photos allowed. You cannot add more.</AlertDescription></Alert>}
                       {isEffectivelyAllGuidedInstructionsDone && enableCamera && <Alert className="mt-3"><CheckCircle className="h-4 w-4"/><AlertTitle>Guided Capture Complete</AlertTitle><AlertDescription>All photo types covered or skipped. You can upload manually if space permits.</AlertDescription></Alert>}
                    </Card>
                  )}
                  
                  <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <CardContent className="p-6 text-center">
                      <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <FormLabel htmlFor="photo-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                        Click to upload files or drag and drop
                      </FormLabel>
                      <FormControl>
                        <Input id="photo-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleFileUpload} disabled={!canTakeMorePhotosOverall} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB each. Max {MAX_PHOTOS} photos total.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                         Required: {photoInstructions.filter(p => !p.isOptional).map(p => p.title).join(', ')}.
                      </p>
                    </CardContent>
                  </Card>
                  {committedPhotoPreviews.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Uploaded Photos:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {committedPhotoPreviews.map((src, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden border shadow">
                            <Image src={src} alt={`Preview ${index + 1}`} layout="fill" objectFit="cover" />
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
                              >
                                <LucideXCircle className="h-4 w-4" />
                                <span className="sr-only">Remove photo</span>
                              </Button>
                            <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                {watchedPhotos[index]?.name.split('-')[0] || `Photo ${index+1}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <FormMessage className="mt-2" /> 
                </FormItem>
              )} />
            )}

            {currentStep === 3 && ( 
               <FormField control={form.control} name="documents" render={() => ( 
                <FormItem>
                  <FormLabel>Upload Supporting Docs (Optional)</FormLabel>
                   <Card className="border-dashed border-2 hover:border-primary transition-colors">
                    <CardContent className="p-6 text-center">
                      <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <FormLabel htmlFor="document-upload" className="text-primary font-semibold cursor-pointer hover:underline">Click to upload or drag and drop</FormLabel>
                      <FormControl><Input id="document-upload" type="file" className="sr-only" accept=".pdf,.doc,.docx,.png,.jpg" multiple 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          const currentDocs = form.getValues("documents") || [];
                          form.setValue("documents", [...currentDocs, ...files], {shouldValidate: true, shouldDirty: true});
                        }}
                      /></FormControl>
                       <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG, etc.</p>
                    </CardContent>
                  </Card>
                  {watchedDocuments && watchedDocuments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Selected Documents:</p>
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
                            >
                              <LucideXCircle className="h-4 w-4" />
                              <span className="sr-only">Remove document</span>
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
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">Review Your Claim Details</h3>
                <ReviewItem label="Vehicle" value={userVehicles.find(v => v.id === form.getValues("vehicleId"))?.name || 'N/A'} />
                <ReviewItem label="Accident Date & Time" value={`${form.getValues("accidentDate")} at ${form.getValues("accidentTime")}`} />
                <ReviewItem label="Location" value={form.getValues("accidentLocation")} />
                <ReviewItem label="Description" value={form.getValues("accidentDescription")} preWrap />
                <ReviewItem label="Photos Uploaded" value={`${form.getValues("photos")?.length || 0}`} />
                <ReviewItem label="Documents Uploaded" value={`${form.getValues("documents")?.length || 0}`} />
                <p className="text-sm text-muted-foreground pt-3">Ensure all info is correct before submitting.</p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {currentStep > 0 && <Button type="button" variant="outline" onClick={handleBack}>Back</Button>}
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

function ReviewItem({ label, value, preWrap = false }: { label: string; value: string | number; preWrap?: boolean}) {
  return (
    <div className="flex flex-col sm:flex-row py-1">
      <strong className="w-full sm:w-1/3 text-sm text-muted-foreground">{label}:</strong>
      <span className={`w-full sm:w-2/3 text-sm ${preWrap ? 'whitespace-pre-wrap break-words' : ''}`}>{value}</span>
    </div>
  );
}

