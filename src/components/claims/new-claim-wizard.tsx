
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
import { Camera as CameraIcon, FileUp, CheckCircle, Car, FileTextIcon, Mic, MicOff, StopCircle, Loader2, AlertTriangle, ArrowRight, LucideXCircle, RefreshCcw, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogModalTitle } from "@/components/ui/dialog";


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

const MAX_ACCIDENT_PHOTOS = 4;

const accidentPhotoInstructions = [
  { id: 'fullVehicle', titleKey: "newClaimWizard.photoInstructions.fullVehicle.title", descriptionKey: "newClaimWizard.photoInstructions.fullVehicle.description", isOptional: false },
  { id: 'damageCloseUp', titleKey: "newClaimWizard.photoInstructions.damageCloseUp.title", descriptionKey: "newClaimWizard.photoInstructions.damageCloseUp.description", isOptional: false },
  { id: 'surroundingArea', titleKey: "newClaimWizard.photoInstructions.surroundingArea.title", descriptionKey: "newClaimWizard.photoInstructions.surroundingArea.description", isOptional: false },
  { id: 'otherVehicles', titleKey: "newClaimWizard.photoInstructions.otherVehicles.title", descriptionKey: "newClaimWizard.photoInstructions.otherVehicles.description", isOptional: true }, // Made this optional for example
];


const claimSchemaStep3 = z.object({
  accidentPhotos: z.array(z.instanceof(File))
    .min(accidentPhotoInstructions.filter(p => !p.isOptional).length, `Please upload at least ${accidentPhotoInstructions.filter(p => !p.isOptional).length} accident photos covering all required types.`)
    .max(MAX_ACCIDENT_PHOTOS, `Maximum ${MAX_ACCIDENT_PHOTOS} accident photos allowed.`)
    .refine(files => {
        if (!files) return false;
        const uploadedInstructionIds = new Set(files.map(file => file.name.split('-')[0]));
        
        const allRequiredUploaded = accidentPhotoInstructions
          .filter(p => !p.isOptional)
          .every(p => uploadedInstructionIds.has(p.id));
        
        return files.length >= accidentPhotoInstructions.filter(p => !p.isOptional).length && allRequiredUploaded;
    }, (files) => {
        const allRequiredPhotoInstructions = accidentPhotoInstructions.filter(p => !p.isOptional);
        const uploadedInstructionIds = new Set(files.map(file => file.name.split('-')[0]));
        const missingRequiredTitles = allRequiredPhotoInstructions
            .filter(p => !uploadedInstructionIds.has(p.id))
            .map(p => p.titleKey) // Will be translated later
            .join(', ');
        
        let message = `Please upload ${allRequiredPhotoInstructions.length} accident photos covering all required types. Missing: ${missingRequiredTitles}. Currently ${files?.length || 0} photos uploaded.`;
        
        return { message };
    })
});

// Define types for the document fields
type DocumentField = "driverLicense" | "registrationCard" | "inspectionReport" | "repairEstimate" | "policeReport";

const claimSchemaStep4 = z.object({
  driverLicense: z.instanceof(File, { message: "Driver's License is required." }),
  registrationCard: z.instanceof(File, { message: "Vehicle Registration Card is required." }),
  inspectionReport: z.instanceof(File).optional(),
  repairEstimate: z.instanceof(File).optional(),
  policeReport: z.instanceof(File).optional(), // Kept as single for now, can be array later
});


const combinedSchema = claimSchemaStep1.merge(claimSchemaStep2).merge(claimSchemaStep3).merge(claimSchemaStep4);
export type ClaimFormValues = z.infer<typeof combinedSchema>; // Exporting for potential external use

const stepsConfig = [
  { id: 1, titleKey: "newClaimWizard.steps.selectVehicle.title", icon: Car, schema: claimSchemaStep1, fields: ['vehicleId'] as const },
  { id: 2, titleKey: "newClaimWizard.steps.accidentDetails.title", icon: FileTextIcon, schema: claimSchemaStep2, fields: ['accidentDate', 'accidentTime', 'accidentLocation', 'accidentDescription'] as const },
  { id: 3, titleKey: "newClaimWizard.steps.uploadAccidentPhotos.title", icon: CameraIcon, schema: claimSchemaStep3, fields: ['accidentPhotos'] as const },
  { id: 4, titleKey: "newClaimWizard.steps.uploadDocuments.title", icon: FileUp, schema: claimSchemaStep4, fields: ['driverLicense', 'registrationCard', 'inspectionReport', 'repairEstimate', 'policeReport'] as const },
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
  accidentPhotoCount: number;
  documentCounts: Record<DocumentField, number>; // e.g. { driverLicense: 1, policeReport: 0 }
}

const documentSlotsDefinition: Array<{ id: DocumentField; labelKey: string; isRequired: boolean; descriptionKey?: string }> = [
    { id: 'driverLicense', labelKey: 'newClaimWizard.documents.driverLicenseLabel', isRequired: true, descriptionKey: 'newClaimWizard.documents.driverLicenseDescription' },
    { id: 'registrationCard', labelKey: 'newClaimWizard.documents.registrationCardLabel', isRequired: true, descriptionKey: 'newClaimWizard.documents.registrationCardDescription' },
    { id: 'inspectionReport', labelKey: 'newClaimWizard.documents.inspectionReportLabel', isRequired: false, descriptionKey: 'newClaimWizard.documents.inspectionReportDescription' },
    { id: 'repairEstimate', labelKey: 'newClaimWizard.documents.repairEstimateLabel', isRequired: false, descriptionKey: 'newClaimWizard.documents.repairEstimateDescription' },
    { id: 'policeReport', labelKey: 'newClaimWizard.documents.policeReportLabel', isRequired: false, descriptionKey: 'newClaimWizard.documents.policeReportDescription' },
];


export function NewClaimWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  // --- Audio Input States ---
  const [isAudioInputEnabled, setIsAudioInputEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [speechApiAvailable, setSpeechApiAvailable] = useState(false);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  // --- Camera States (shared for accident photos and documents) ---
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFor, setCameraFor] = useState<'accidentPhoto' | DocumentField | null>(null); // 'accidentPhoto' or a DocumentField like 'driverLicense'
  const [currentAccidentPhotoInstructionIndex, setCurrentAccidentPhotoInstructionIndex] = useState(0);
  
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null); // Generic for any capture
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  // --- File Previews ---
  const [accidentPhotoPreviews, setAccidentPhotoPreviews] = useState<string[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<Partial<Record<DocumentField, string>>>({}); // Store data URIs for previews

  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(combinedSchema),
    mode: "onChange", 
    defaultValues: {
      vehicleId: "",
      accidentDate: new Date().toISOString().split('T')[0],
      accidentTime: new Date().toTimeString().substring(0,5),
      accidentLocation: "",
      accidentDescription: "",
      accidentPhotos: [],
      driverLicense: undefined,
      registrationCard: undefined,
      inspectionReport: undefined,
      repairEstimate: undefined,
      policeReport: undefined,
    },
  });
  
  const watchedAccidentPhotos = form.watch("accidentPhotos");
  const watchedDriverLicense = form.watch("driverLicense");
  const watchedRegistrationCard = form.watch("registrationCard");
  const watchedInspectionReport = form.watch("inspectionReport");
  const watchedRepairEstimate = form.watch("repairEstimate");
  const watchedPoliceReport = form.watch("policeReport");

  const watchedDocumentsState = {
    driverLicense: watchedDriverLicense,
    registrationCard: watchedRegistrationCard,
    inspectionReport: watchedInspectionReport,
    repairEstimate: watchedRepairEstimate,
    policeReport: watchedPoliceReport,
  };

  const translatedAccidentPhotoInstructions = accidentPhotoInstructions.map(instr => ({
    ...instr,
    title: t(instr.titleKey),
    description: t(instr.descriptionKey)
  }));

  // Manage Accident Photo Previews
  useEffect(() => {
    const currentFiles = watchedAccidentPhotos || [];
    const newPreviews = currentFiles
        .filter(file => file instanceof File)
        .map(file => URL.createObjectURL(file as File));
    
    accidentPhotoPreviews.forEach(url => URL.revokeObjectURL(url));
    setAccidentPhotoPreviews(newPreviews);

    return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAccidentPhotos]);

  // Manage Document Previews (for files that are images)
  useEffect(() => {
    const newDocPreviews: Partial<Record<DocumentField, string>> = {};
    let urlsToRevoke: string[] = Object.values(documentPreviews);

    (Object.keys(watchedDocumentsState) as DocumentField[]).forEach(docField => {
        const file = watchedDocumentsState[docField];
        if (file instanceof File && file.type.startsWith("image/")) {
            newDocPreviews[docField] = URL.createObjectURL(file);
        }
    });
    
    setDocumentPreviews(newDocPreviews);

    return () => {
        Object.values(newDocPreviews).forEach(url => URL.revokeObjectURL(url));
        urlsToRevoke.forEach(url => URL.revokeObjectURL(url)); // Revoke old ones if component unmounts
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDriverLicense, watchedRegistrationCard, watchedInspectionReport, watchedRepairEstimate, watchedPoliceReport]);


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
    if (cameraPermissionStatus !== 'denied' && cameraPermissionStatus !== 'pending') {
      setCameraPermissionStatus('idle');
    }
  }, [cameraPermissionStatus]);


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
    stopCurrentStream(); // Stop any existing stream

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 1280 }, // Adjusted for potentially better document capture
                height: { ideal: 720 }
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
    if (showCameraModal && cameraFor && !capturedDataUrl) {
      startCamera();
    } else if (!showCameraModal || capturedDataUrl) {
      stopCurrentStream();
    }
    // Cleanup stream when modal is closed or component unmounts
    return () => {
      stopCurrentStream();
    };
  }, [showCameraModal, cameraFor, capturedDataUrl, startCamera, stopCurrentStream]);


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

  const currentAccidentPhotoInstruction = translatedAccidentPhotoInstructions[currentAccidentPhotoInstructionIndex];
  const getCommittedAccidentPhotoCount = () => (form.getValues("accidentPhotos") || []).length;
  const canTakeMoreAccidentPhotos = () => getCommittedAccidentPhotoCount() < MAX_ACCIDENT_PHOTOS;


  const addAccidentPhotosToForm = (newFiles: File[]) => {
    const currentFiles: File[] = form.getValues("accidentPhotos") || [];
    const availableSlots = MAX_ACCIDENT_PHOTOS - currentFiles.length;

    if (availableSlots <= 0) {
      toast({ variant: "destructive", title: t("newClaimWizard.photoError.limitReachedTitle"), description: t("newClaimWizard.photoError.limitReachedDescription", { maxPhotos: MAX_ACCIDENT_PHOTOS }) });
      return;
    }
    const filesToActuallyAdd = newFiles.slice(0, availableSlots);
    form.setValue("accidentPhotos", [...currentFiles, ...filesToActuallyAdd], { shouldValidate: true, shouldDirty: true });
    if (filesToActuallyAdd.length < newFiles.length) {
      toast({ variant: "warning", title: t("newClaimWizard.photoError.limitReachedTitle"), description: t("newClaimWizard.photoError.someNotAdded", { countAdded: filesToActuallyAdd.length, countNotAdded: newFiles.length - filesToActuallyAdd.length }) });
    }
  };

  const handleAccidentPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) addAccidentPhotosToForm(files);
  };
  
  const handleCaptureForCamera = () => {
    if (!videoRef.current || !canvasRef.current || cameraPermissionStatus !== 'granted' || isProcessingPhoto || !cameraFor) {
        if(cameraPermissionStatus !== 'granted' && showCameraModal) console.warn("Camera not active, cannot capture.");
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for smaller file sizes
      setCapturedDataUrl(dataUrl);
    }
    setIsProcessingPhoto(false);
    stopCurrentStream(); // Stop stream after capture to show preview
  };

  const handleUseCapturedPhoto = async () => {
    if (!capturedDataUrl || !cameraFor || isProcessingPhoto) return;
  
    setIsProcessingPhoto(true);
    try {
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const fileExtension = cameraFor === 'accidentPhoto' ? 'jpg' : 'jpg'; // could be different for documents
      const baseFileName = cameraFor === 'accidentPhoto' ? currentAccidentPhotoInstruction.id : cameraFor;
      const fileName = `${baseFileName}-${Date.now()}.${fileExtension}`;
      const file = new File([blob], fileName, { type: `image/${fileExtension}` });
      
      if (cameraFor === 'accidentPhoto') {
        addAccidentPhotosToForm([file]);
        if (getCommittedAccidentPhotoCount() >= MAX_ACCIDENT_PHOTOS) {
            toast({ title: t("newClaimWizard.photoMessages.limitReachedTitle"), description: t("newClaimWizard.photoMessages.limitReachedDescription", {maxPhotos: MAX_ACCIDENT_PHOTOS}) });
            closeCameraModal();
        } else if (currentAccidentPhotoInstructionIndex < translatedAccidentPhotoInstructions.length - 1) {
            setCurrentAccidentPhotoInstructionIndex(prev => prev + 1);
        } else {
            toast({ title: t("newClaimWizard.photoMessages.allTypesCapturedTitle"), description: t("newClaimWizard.photoMessages.allTypesCapturedDescription") });
            closeCameraModal();
        }
      } else { // It's for a document
        form.setValue(cameraFor, file, { shouldValidate: true, shouldDirty: true });
        closeCameraModal();
      }
      setCapturedDataUrl(null); // Reset for next capture
    } catch (error) {
      console.error("Error processing photo:", error);
      toast({ variant: "destructive", title: t("newClaimWizard.photoError.genericErrorTitle"), description: t("newClaimWizard.photoError.couldNotProcess") });
    } finally {
      setIsProcessingPhoto(false);
    }
  };
  
  const handleRetakeCapturedPhoto = () => {
    setCapturedDataUrl(null);
    if (showCameraModal && cameraFor) { // Restart camera only if modal is supposed to be open
        startCamera();
    }
  };

  const handleSkipAccidentPhotoInstruction = () => {
    setCapturedDataUrl(null); 
    if (currentAccidentPhotoInstructionIndex < translatedAccidentPhotoInstructions.length - 1) {
      setCurrentAccidentPhotoInstructionIndex(prev => prev + 1);
    } else {
      toast({ title: t("newClaimWizard.photoMessages.finishedGuidedCaptureTitle"), description: t("newClaimWizard.photoMessages.finishedGuidedCaptureDescription")});
       setShowCameraModal(false); // Close modal if all are skipped/done
    }
  };

  const openCameraModal = (type: 'accidentPhoto' | DocumentField) => {
    setCameraFor(type);
    if (type === 'accidentPhoto') {
      setCurrentAccidentPhotoInstructionIndex(0); // Reset for accident photos
    }
    setCapturedDataUrl(null); // Clear any previous capture
    setShowCameraModal(true);
    // `startCamera` will be called by useEffect based on `showCameraModal` and `cameraFor`
  };

  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCameraFor(null);
    setCapturedDataUrl(null);
    stopCurrentStream(); // Ensure stream is stopped
  };

  const handleDocumentFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fieldName: DocumentField) => {
    const file = event.target.files?.[0];
    if (file) {
        form.setValue(fieldName, file, { shouldValidate: true, shouldDirty: true });
    }
    event.target.value = ''; // Reset file input
  };

  const handleRemoveDocument = (fieldName: DocumentField) => {
    form.setValue(fieldName, undefined, { shouldValidate: true, shouldDirty: true });
    setDocumentPreviews(prev => ({...prev, [fieldName]: undefined}));
  };


  const handleNext = async () => {
    const currentStepObj = stepsConfig[currentStep];
    const fieldsToValidate = currentStepObj.fields;
    
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
       
       // More specific error messaging based on current step's fields
       const errorKeys = Object.keys(errors) as Array<keyof ClaimFormValues>;
       const relevantErrorField = errorKeys.find(key => fieldsToValidate.includes(key as any));
       
       if (relevantErrorField && errors[relevantErrorField]) {
           // @ts-ignore
           const fieldErrorMessage = errors[relevantErrorField]?.message;
           if (typeof fieldErrorMessage === 'string') {
             errorMessage = fieldErrorMessage;
           } else if (currentStepObj.id === 3 && errors.accidentPhotos && typeof errors.accidentPhotos.message === 'string') {
             errorMessage = errors.accidentPhotos.message;
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

    const documentCounts: Record<DocumentField, number> = {
        driverLicense: data.driverLicense ? 1 : 0,
        registrationCard: data.registrationCard ? 1 : 0,
        inspectionReport: data.inspectionReport ? 1 : 0,
        repairEstimate: data.repairEstimate ? 1 : 0,
        policeReport: data.policeReport ? 1 : 0,
    };

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
      accidentPhotoCount: (data.accidentPhotos || []).length,
      documentCounts,
    };

    try {
      const existingClaimsString = localStorage.getItem("userClaims");
      const existingClaims: StoredClaim[] = existingClaimsString ? JSON.parse(existingClaimsString) : [];
      existingClaims.unshift(newClaim); 
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
    setAccidentPhotoPreviews([]); 
    setDocumentPreviews({});
    if (speechRecognitionRef.current && isRecording) speechRecognitionRef.current.stop();
    setIsAudioInputEnabled(false);
    closeCameraModal();
    setCurrentAccidentPhotoInstructionIndex(0);
  }
  
  const progressValue = ((currentStep + 1) / stepsConfig.length) * 100;
  const CurrentIcon = stepsConfig[currentStep].icon;
  
  const currentAccidentPhotoGuide = cameraFor === 'accidentPhoto' ? translatedAccidentPhotoInstructions[currentAccidentPhotoInstructionIndex] : null;
  const isEffectivelyAllAccidentInstructionsDone = cameraFor === 'accidentPhoto' && currentAccidentPhotoInstructionIndex >= translatedAccidentPhotoInstructions.length;


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
            {currentStep === 0 && ( // Step 1: Select Vehicle
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

            {currentStep === 1 && ( // Step 2: Accident Details
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

            {currentStep === 2 && (() => { // Step 3: Accident Photos
              const currentPhotoCount = getCommittedAccidentPhotoCount();
              const maxPhotoCount = MAX_ACCIDENT_PHOTOS;
              return (
                <FormField control={form.control} name="accidentPhotos" render={() => ( 
                  <FormItem>
                    <FormLabel>
                        {t('newClaimWizard.uploadAccidentPhotos.label')} {`(${currentPhotoCount}/${maxPhotoCount})`}
                    </FormLabel>
                    <div className="space-y-3">
                        <Button type="button" onClick={() => openCameraModal('accidentPhoto')} className="w-full" variant="outline" disabled={!canTakeMoreAccidentPhotos()}>
                            <CameraIcon className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.takeAccidentPhotos')}
                        </Button>
                        
                        <Card className="border-dashed border-2 hover:border-primary transition-colors">
                          <CardContent className="p-6 text-center">
                            <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                            <FormLabel htmlFor="accident-photo-upload" className="text-primary font-semibold cursor-pointer hover:underline">
                              {t('newClaimWizard.uploadAccidentPhotos.uploadLabel')}
                            </FormLabel>
                            <FormControl>
                              <Input id="accident-photo-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleAccidentPhotoUpload} disabled={!canTakeMoreAccidentPhotos()} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">{t('newClaimWizard.uploadPhotos.fileTypesAndSize', { maxPhotos: MAX_ACCIDENT_PHOTOS})}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                               {t('newClaimWizard.uploadPhotos.requiredPhotosIntro')}: {translatedAccidentPhotoInstructions.filter(p => !p.isOptional).map(p => p.title).join(', ')}.
                            </p>
                          </CardContent>
                        </Card>

                        {accidentPhotoPreviews.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">{t('newClaimWizard.uploadPhotos.uploadedPhotosTitle')}:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {accidentPhotoPreviews.map((src, index) => (
                                <div key={index} className="relative aspect-square rounded-md overflow-hidden border shadow">
                                  <Image src={src} alt={t('newClaimWizard.uploadPhotos.previewIndexedAlt', { index: index + 1 })} layout="fill" objectFit="cover" />
                                   <Button 
                                      type="button" 
                                      variant="destructive" 
                                      size="icon" 
                                      className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100 z-10"
                                      onClick={() => {
                                        const currentPhotos = form.getValues("accidentPhotos") || [];
                                        const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
                                        form.setValue("accidentPhotos", updatedPhotos, { shouldValidate: true, shouldDirty: true });
                                      }}
                                      aria-label={t('newClaimWizard.buttons.removePhoto')}
                                    >
                                      <LucideXCircle className="h-4 w-4" />
                                    </Button>
                                  <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                      { (watchedAccidentPhotos[index]?.name.split('-')[0] && translatedAccidentPhotoInstructions.find(instr => instr.id === watchedAccidentPhotos[index]?.name.split('-')[0])?.title) || t('newClaimWizard.uploadPhotos.photoIndexed', { index: index + 1 })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <FormMessage className="mt-2" /> 
                    </div>
                  </FormItem>
                )} />
              )
            })()}

            {currentStep === 3 && ( // Step 4: Upload Documents
                <div className="space-y-6">
                    {documentSlotsDefinition.map((docSlot) => (
                        <FormField
                            key={docSlot.id}
                            control={form.control}
                            name={docSlot.id}
                            render={({ field }) => (
                                <FormItem className="p-4 border rounded-lg shadow-sm bg-muted/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <FormLabel className="text-base font-semibold">
                                            {t(docSlot.labelKey)}
                                            {docSlot.isRequired && <span className="text-destructive ml-1">*</span>}
                                        </FormLabel>
                                        {field.value && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveDocument(docSlot.id)} className="text-destructive hover:text-destructive">
                                                <Trash2 className="mr-1 h-4 w-4" /> {t('newClaimWizard.buttons.removeDocument')}
                                            </Button>
                                        )}
                                    </div>
                                    {docSlot.descriptionKey && <p className="text-xs text-muted-foreground mb-3">{t(docSlot.descriptionKey)}</p>}

                                    {!field.value ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Button type="button" variant="outline" onClick={() => document.getElementById(`file-upload-${docSlot.id}`)?.click()}>
                                                <UploadCloud className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.uploadFile')}
                                                <Input 
                                                    id={`file-upload-${docSlot.id}`}
                                                    type="file" 
                                                    className="sr-only" 
                                                    accept="image/*,.pdf,.doc,.docx" 
                                                    onChange={(e) => handleDocumentFileUpload(e, docSlot.id)} 
                                                />
                                            </Button>
                                            <Button type="button" variant="outline" onClick={() => openCameraModal(docSlot.id)}>
                                                <CameraIcon className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.takePhoto')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="mt-2 p-2 border rounded-md bg-background">
                                            {documentPreviews[docSlot.id] ? (
                                                <Image src={documentPreviews[docSlot.id]!} alt={t(docSlot.labelKey) + " preview"} width={120} height={90} className="rounded-md object-contain max-h-24 mx-auto border" />
                                            ) : (
                                                <FileTextIcon className="h-10 w-10 text-muted-foreground mx-auto my-2" />
                                            )}
                                            <p className="text-sm text-center truncate mt-1">{field.value.name}</p>
                                            <p className="text-xs text-muted-foreground text-center">({(field.value.size / 1024).toFixed(1)} KB)</p>
                                        </div>
                                    )}
                                    <FormMessage className="mt-2" />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            )}


            {currentStep === 4 && ( // Step 5: Review and Submit
              <div className="space-y-3 p-2 rounded-md border bg-muted/20">
                <h3 className="text-lg font-semibold mb-3 border-b pb-2">{t('newClaimWizard.reviewSubmit.title')}</h3>
                <ReviewItem label={t('newClaimWizard.reviewSubmit.vehicleLabel')} value={userVehicles.find(v => v.id === form.getValues("vehicleId"))?.name || 'N/A'} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.dateTimeLabel')} value={`${form.getValues("accidentDate")} ${t('newClaimWizard.reviewSubmit.atTimeConnector')} ${form.getValues("accidentTime")}`} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.locationLabel')} value={form.getValues("accidentLocation")} />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.descriptionLabel')} value={form.getValues("accidentDescription")} preWrap />
                <ReviewItem label={t('newClaimWizard.reviewSubmit.accidentPhotosUploadedLabel')} value={`${form.getValues("accidentPhotos")?.length || 0}`} />
                
                <h4 className="text-md font-semibold mt-4 pt-2 border-t">{t('newClaimWizard.reviewSubmit.documentsUploadedTitle')}</h4>
                {documentSlotsDefinition.map(slot => (
                    <ReviewItem 
                        key={slot.id} 
                        label={t(slot.labelKey) + (slot.isRequired ? '*' : '')} 
                        value={form.getValues(slot.id) ? (form.getValues(slot.id) as File).name : t('common.notProvided')} 
                    />
                ))}
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

        <Dialog open={showCameraModal} onOpenChange={(isOpen) => { if (!isOpen) closeCameraModal(); else setShowCameraModal(true); }}>
            <DialogContent className="sm:max-w-[625px] p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogModalTitle>
                        {cameraFor === 'accidentPhoto' 
                            ? (currentAccidentPhotoGuide?.title || t('newClaimWizard.cameraModal.titleAccidentPhoto'))
                            : (cameraFor ? t(documentSlotsDefinition.find(d=>d.id === cameraFor)?.labelKey || 'newClaimWizard.cameraModal.titleDocument') : '')
                        }
                    </DialogModalTitle>
                </DialogHeader>
                <div className="p-4 space-y-3">
                    {cameraFor === 'accidentPhoto' && currentAccidentPhotoGuide && (
                         <Card className="p-3 bg-primary/5 border-primary/20 text-sm">
                            <CardDescription>{currentAccidentPhotoGuide.description}</CardDescription>
                        </Card>
                    )}

                    {!capturedDataUrl ? (
                        <>
                            <div className="relative w-full aspect-video rounded-md bg-black overflow-hidden">
                               <video ref={videoRef} className="w-full h-full object-contain" playsInline muted autoPlay />
                               {cameraPermissionStatus === 'pending' && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><Loader2 className="h-8 w-8 animate-spin text-primary" /><AlertDescription className="mt-2">{t('newClaimWizard.cameraMessages.initializing')}</AlertDescription></Alert>}
                               {cameraPermissionStatus === 'denied' && <Alert variant="destructive" className="absolute inset-0 m-auto max-w-sm max-h-40 flex flex-col items-center justify-center"><AlertTriangle className="h-5 w-5 mb-1" /><AlertTitle className="text-sm">{t('newClaimWizard.cameraError.accessDeniedTitle')}</AlertTitle><AlertDescription className="text-xs text-center">{t('newClaimWizard.cameraError.permissionDenied')}</AlertDescription></Alert>}
                               {cameraPermissionStatus === 'granted' && videoRef.current && !videoRef.current?.videoWidth && <Alert className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white pointer-events-none"><AlertDescription>{t('newClaimWizard.cameraMessages.feedLoading')}</AlertDescription></Alert>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                {cameraPermissionStatus === 'granted' && cameraFor === 'accidentPhoto' && currentAccidentPhotoGuide && !isEffectivelyAllAccidentInstructionsDone && (
                                  <Button type="button" onClick={handleCaptureForCamera} className="flex-1 min-w-[120px]" disabled={isProcessingPhoto || !canTakeMoreAccidentPhotos()}>
                                    {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CameraIcon className="mr-2 h-4 w-4" />}
                                    {t('newClaimWizard.buttons.capturePhoto')}
                                  </Button>
                                )}
                                {cameraPermissionStatus === 'granted' && cameraFor !== 'accidentPhoto' && (
                                     <Button type="button" onClick={handleCaptureForCamera} className="flex-1 min-w-[120px]" disabled={isProcessingPhoto}>
                                        {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CameraIcon className="mr-2 h-4 w-4" />}
                                        {t('newClaimWizard.buttons.capturePhoto')}
                                    </Button>
                                )}
                                <Button type="button" variant="outline" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} disabled={cameraPermissionStatus !== 'granted'}>
                                    <RefreshCcw className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.switchCamera')}
                                </Button>
                            </div>
                            {cameraFor === 'accidentPhoto' && currentAccidentPhotoGuide && (currentAccidentPhotoGuide.isOptional || currentAccidentPhotoInstructionIndex >= translatedAccidentPhotoInstructions.filter(p=>!p.isOptional).length) && !isEffectivelyAllAccidentInstructionsDone && cameraPermissionStatus === 'granted' && (
                               <Button type="button" variant="ghost" onClick={handleSkipAccidentPhotoInstruction} className="w-full mt-2 text-sm">
                                  {t('newClaimWizard.buttons.skipThisPhoto', { photoTitle: currentAccidentPhotoGuide.title })}
                                  <ArrowRight className="ml-2 h-4 w-4"/>
                              </Button>
                            )}
                            {cameraFor === 'accidentPhoto' && isEffectivelyAllAccidentInstructionsDone && (
                                <Alert className="mt-3"><CheckCircle className="h-4 w-4"/><AlertTitle>{t('newClaimWizard.photoMessages.allTypesCapturedTitle')}</AlertTitle><AlertDescription>{t('newClaimWizard.photoMessages.allTypesCapturedDescription') + " " + t('newClaimWizard.photoMessages.canCloseOrUploadMore')}</AlertDescription></Alert>
                            )}
                        </>
                    ) : ( 
                        <div className="text-center">
                            <p className="text-sm font-medium mb-2">
                                {cameraFor === 'accidentPhoto' 
                                    ? t('newClaimWizard.uploadPhotos.previewTitle', { photoTitle: currentAccidentPhotoGuide?.title || 'Photo' })
                                    : t('newClaimWizard.uploadPhotos.previewTitle', { photoTitle: t(documentSlotsDefinition.find(d => d.id === cameraFor)?.labelKey || 'Document') })
                                }
                            </p>
                            <Image src={capturedDataUrl} alt="Captured preview" width={320} height={240} className="rounded-md mx-auto mb-3 max-w-full h-auto object-contain border" />
                            <div className="flex justify-center gap-3">
                              <Button type="button" onClick={handleUseCapturedPhoto} className="bg-green-600 hover:bg-green-700 text-white" 
                                disabled={isProcessingPhoto || (cameraFor === 'accidentPhoto' && !canTakeMoreAccidentPhotos())}
                              >
                                {isProcessingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                {t('newClaimWizard.buttons.usePhoto')}
                              </Button>
                              <Button type="button" variant="outline" onClick={handleRetakeCapturedPhoto} disabled={isProcessingPhoto}>
                                <CameraIcon className="mr-2 h-4 w-4" /> {t('newClaimWizard.buttons.retakePhoto')}
                              </Button>
                            </div>
                        </div>
                    )}
                    {!canTakeMoreAccidentPhotos() && cameraFor === 'accidentPhoto' && <Alert variant="warning" className="mt-3"><AlertTriangle className="h-4 w-4" /><AlertTitle>{t('newClaimWizard.photoError.limitReachedTitle')}</AlertTitle><AlertDescription>{t('newClaimWizard.photoError.maxPhotos', {maxPhotos: MAX_ACCIDENT_PHOTOS})}</AlertDescription></Alert>}
                </div>
                 <div className="p-4 border-t flex justify-end">
                    <Button variant="outline" onClick={closeCameraModal}>{t('newClaimWizard.buttons.closeCamera')}</Button>
                </div>
            </DialogContent>
        </Dialog>
    </Card>
  );
}

function ReviewItem({ label, value, preWrap = false }: { label: string; value: string | number; preWrap?: boolean}) {
  const { t } = useLanguage(); 
  return (
    <div className="flex flex-col sm:flex-row py-1 text-sm">
      <strong className="w-full sm:w-2/5 text-muted-foreground">{label}:</strong>
      <span className={`w-full sm:w-3/5 ${preWrap ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>{value || t('common.notApplicableShort')}</span>
    </div>
  );
}

    