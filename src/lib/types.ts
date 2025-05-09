// This file can be used to define common types used across the application.
// For now, it's a placeholder. As the app grows, interfaces for User, Policy,
// Vehicle, Claim, etc., would be defined here.

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  // Add other vehicle-specific fields like color, VIN, documents, etc.
  documents?: VehicleDocument[];
  imageUrl?: string;
}

export interface VehicleDocument {
  id: string;
  name: string;
  url: string; // URL to the stored document
  type: 'registration' | 'logbook' | 'insurance_policy' | 'other';
}

export interface Policy {
  id: string;
  policyNumber: string;
  userId: string;
  vehicleId?: string; // Optional if it's not a vehicle policy
  type: 'vehicle' | 'health' | 'home' | 'life';
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  premium: number;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  coverageDetails?: string; // Summary or link to full details
}

export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  userId: string;
  vehicleId?: string;
  accidentDate: string; // ISO Date string
  accidentDescription: string;
  photos?: string[]; // URLs to photos
  supportingDocuments?: string[]; // URLs to documents
  status: 'submitted' | 'under_review' | 'information_requested' | 'approved' | 'rejected' | 'settled';
  submissionDate: string; // ISO Date string
  settlementAmount?: number;
  notes?: string; // Internal notes or communication log
}

export interface Payment {
  id: string;
  transactionId: string; // From payment gateway
  userId: string;
  policyId?: string; // Or claimId, or other reference
  amount: number;
  currency: 'TZS'; // Assuming Tanzanian Shillings
  paymentMethod: 'mobile_money' | 'card' | 'bank_transfer';
  paymentProvider?: 'M-Pesa' | 'Tigo Pesa' | 'Airtel Money' | 'Visa' | 'Mastercard'; // etc.
  status: 'pending' | 'successful' | 'failed';
  paymentDate: string; // ISO Date string
  receiptUrl?: string;
}
