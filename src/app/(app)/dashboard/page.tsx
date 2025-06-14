
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Car, FilePlus2, ShieldCheck, CreditCard, MessageSquare, PlusCircle, Loader2, ImageOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Policy, Vehicle as AppVehicle } from "@/lib/types"; // Assuming Vehicle type is also in types.ts
import { useToast } from "@/hooks/use-toast"; // Added this import

// Mock data for recentClaims - to be replaced later
const recentClaims = [
  { id: "C1", vehicleName: "Toyota IST", status: "Under Review", date: "2024-07-10" },
];

// initialVehicles is now fetched from Firestore or remains empty
// const initialVehicles = [
//   { id: "V1", name: "Toyota IST", model: "2010", plate: "T123 ABC", imageUrl:"https://placehold.co/100x70.png" },
//   { id: "V2", name: "Nissan March", model: "2012", plate: "T456 XYZ", imageUrl:"https://placehold.co/100x70.png"  },
// ];

// Mock data for notifications - to be replaced later
const mockUser = {
  notificationsCount: 3,
};

interface DashboardPolicy extends Policy {
  vehicleName?: string;
}


export default function DashboardPage() {
  const { t } = useLanguage();
  const { currentUser, userProfile, loadingAuth, loadingProfile } = useAuth();
  const [policies, setPolicies] = useState<DashboardPolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [vehicles, setVehicles] = useState<AppVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const { toast } = useToast(); // Moved useToast inside the component body, ensure import exists


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (currentUser) {
        // Fetch Policies
        setLoadingPolicies(true);
        try {
          const policiesRef = collection(db, "users", currentUser.uid, "policies");
          const qPolicies = query(policiesRef, orderBy("endDate", "desc")); // Assuming policies have an endDate
          const policiesSnapshot = await getDocs(qPolicies);
          const fetchedPolicies = policiesSnapshot.docs.map(doc => {
            const data = doc.data() as Omit<Policy, 'id'>;
            // Attempt to link vehicle name if vehicleId exists and vehicles are loaded
            // This part depends on vehicles being fetched first or simultaneously.
            // For now, we'll simplify or assume vehicles might not be fully loaded yet for name linking.
            let vehicleName = "N/A"; // Default
            if (data.vehicleId) {
                // Try to find in already fetched vehicles for this page, if any
                const linkedVehicle = vehicles.find(v => v.id === data.vehicleId);
                if(linkedVehicle) vehicleName = `${linkedVehicle.make} ${linkedVehicle.model}`;
                else vehicleName = data.type === 'vehicle' ? "Vehicle Policy" : data.type; // Fallback
            } else {
                vehicleName = data.type; // For non-vehicle policies like "Health"
            }
            return {
              id: doc.id,
              ...data,
              vehicleName: vehicleName,
            } as DashboardPolicy;
          });
          setPolicies(fetchedPolicies);
        } catch (error) {
          console.error("Error fetching policies for dashboard:", error);
          toast({ title: t('common.error'), description: t('dashboard.fetchPoliciesError'), variant: "destructive" });
        } finally {
          setLoadingPolicies(false);
        }

        // Fetch Vehicles
        setLoadingVehicles(true);
        try {
          const vehiclesRef = collection(db, "users", currentUser.uid, "vehicles");
          const qVehicles = query(vehiclesRef, orderBy("createdAt", "desc"));
          const vehiclesSnapshot = await getDocs(qVehicles);
          const fetchedVehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppVehicle));
          setVehicles(fetchedVehicles);
        } catch (error) {
            console.error("Error fetching vehicles for dashboard:", error);
            toast({ title: t('common.error'), description: t('dashboard.fetchVehiclesError'), variant: "destructive" });
        } finally {
            setLoadingVehicles(false);
        }
      } else {
        setLoadingPolicies(false);
        setLoadingVehicles(false);
        setPolicies([]); // Clear policies if no user
        setVehicles([]); // Clear vehicles if no user
      }
    };

    if (!loadingAuth && currentUser) {
      fetchDashboardData();
    } else if (!loadingAuth && !currentUser) {
      // If auth is done and no user, ensure loading states are false and data is empty
      setLoadingPolicies(false);
      setLoadingVehicles(false);
      setPolicies([]);
      setVehicles([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, loadingAuth, t]); // Removed toast from deps


  if (loadingAuth || (currentUser && (loadingProfile || loadingPolicies || loadingVehicles))) {
    return (
      <PageContainer className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </PageContainer>
    );
  }
  
  const displayName = userProfile?.fullName || userProfile?.email || t('pageHeader.guest');


  return (
    <>
      <PageHeader title={t('pageHeader.welcome', { name: displayName })}>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications" aria-label={t('common.notifications')}>
            <Bell className="h-5 w-5" />
            {mockUser.notificationsCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
            )}
          </Link>
        </Button>
      </PageHeader>
      <PageContainer>
        <div className="grid gap-6">
          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold mb-3">{t('dashboard.quickActions')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickActionCard href="/claims/new" icon={FilePlus2} label={t('dashboard.startClaim')} />
              <QuickActionCard href="/quotes" icon={ShieldCheck} label={t('dashboard.getQuote')} />
              <QuickActionCard href="/payments" icon={CreditCard} label={t('dashboard.makePayment')} />
              <QuickActionCard href="/chat" icon={MessageSquare} label={t('dashboard.supportChat')} />
            </div>
          </section>

          {/* My Policies */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">{t('dashboard.myPolicies')}</h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/policies"><span>{t('common.viewAll')}</span></Link>
              </Button>
            </div>
            {loadingPolicies ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : policies.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {policies.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">{t('dashboard.noPoliciesFound')}</p>
                  <Button className="mt-4" asChild>
                    <Link href="/quotes"><span>{t('dashboard.getQuote')}</span></Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* My Vehicles */}
           <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">{t('dashboard.myVehicles')}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile#vehicles" className="flex items-center">
                  <PlusCircle className="h-4 w-4 mr-1" /> <span>{t('dashboard.addVehicle')}</span>
                </Link>
              </Button>
            </div>
            {loadingVehicles ? (
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : vehicles.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map(vehicle => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">{t('dashboard.noVehiclesFound')}</p>
                  <Button className="mt-4" asChild>
                    <Link href="/profile#vehicles"><span>{t('dashboard.addYourVehicle')}</span></Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Recent Claims Activity */}
          <section>
            <h2 className="text-lg font-semibold mb-3">{t('dashboard.recentClaimsActivity')}</h2>
             {recentClaims.length > 0 ? ( // This still uses mock data
              <div className="space-y-3">
                {recentClaims.map(claim => (
                  <Card key={claim.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{claim.vehicleName}</p>
                        <p className="text-sm text-muted-foreground">{t('common.submitted')}: {claim.date}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        claim.status === "Under Review" ? "bg-yellow-100 text-yellow-700" :
                        claim.status === "Settled" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {claim.status} {/* This status needs translation if it becomes dynamic */}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">{t('dashboard.noRecentClaimsActivity')}</p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </PageContainer>
    </>
  );
}

function QuickActionCard({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) {
  return (
    <Link href={href} className="block">
      <Card className="hover:bg-primary/10 hover:shadow-lg transition-all duration-200">
        <CardContent className="flex flex-col items-center justify-center p-4 aspect-square">
          <Icon className="h-8 w-8 text-primary mb-2" />
          <span className="text-sm font-medium text-center">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function PolicyCard({ policy }: { policy: DashboardPolicy }) {
  const { t } = useLanguage();
  // Handle both Timestamp and string dates
  const getDisplayDate = (dateInput: string | Timestamp) => {
    if (dateInput instanceof Timestamp) {
      return dateInput.toDate().toLocaleDateString();
    }
    // Attempt to parse if it's a string that might be an ISO string or similar
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString();
    }
    return String(dateInput); // Fallback to string if not a Timestamp or valid date string
  };
  
  const displayEndDate = getDisplayDate(policy.endDate);
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{policy.vehicleName || `${policy.type} Insurance`}</CardTitle>
        <CardDescription>Policy: {policy.policyNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{t('common.expires')}: <span className="font-medium">{displayEndDate}</span></p>
        <p className="text-sm">Status: <span className={`font-medium ${policy.status === "active" ? "text-green-600" : (policy.status === "expired" ? "text-red-600" : "text-yellow-600")}`}>{t(`policyCard.status.${policy.status}`, {defaultValue: policy.status})}</span></p>
      </CardContent>
      <CardFooter>
        <Button variant="link" className="p-0 h-auto text-primary" asChild>
          {/* The link to /policies/:id is a placeholder for now as the page doesn't exist */}
          <Link href={`/policies/${policy.id}`}>
            <span>{t('common.viewDetails')}</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function VehicleCard({ vehicle }: { vehicle: AppVehicle }) {
  const { t } = useLanguage();
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow overflow-hidden">
       <div className="flex items-center p-4">
       {vehicle.imageUrl ? (
            <Image
                src={vehicle.imageUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                width={80}
                height={56}
                className="rounded-md object-cover mr-4"
                data-ai-hint="vehicle side"
            />
        ) : (
            <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center mr-4">
                <ImageOff className="h-8 w-8 text-muted-foreground" data-ai-hint="vehicle placeholder" />
            </div>
        )}
        <div className="flex-1">
          <CardTitle className="text-lg">{vehicle.make} {vehicle.model}</CardTitle>
          <CardDescription>{vehicle.year} - {vehicle.registrationNumber}</CardDescription>
           <Button variant="link" size="sm" className="p-0 h-auto text-primary mt-1" asChild>
            <Link href={`/profile#vehicle-${vehicle.id}`}>
              <span>{t('common.edit')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
