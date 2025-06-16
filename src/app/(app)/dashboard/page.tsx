
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Car, FilePlus2, ShieldCheck, CreditCard, MessageSquare, PlusCircle, Loader2, ImageOff, ListChecks } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, limit } from "firebase/firestore";
import type { Policy, Vehicle as AppVehicle, Claim } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// No longer using mockUser for notifications count, this would come from a real notification system
// const mockUser = {
//   notificationsCount: 3, // Example, replace with actual count
// };

export default function DashboardPage() {
  const { t } = useLanguage();
  const { currentUser, userProfile, loadingAuth, loadingProfile } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [vehicles, setVehicles] = useState<AppVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [dashboardClaims, setDashboardClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [notificationsCount, setNotificationsCount] = useState(0); // Placeholder for real notifications

  const { toast } = useToast();


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (currentUser) {
        // Fetch Policies
        setLoadingPolicies(true);
        try {
          const policiesRef = collection(db, "users", currentUser.uid, "policies");
          const qPolicies = query(policiesRef, orderBy("endDate", "desc"));
          const policiesSnapshot = await getDocs(qPolicies);
          const fetchedPolicies = policiesSnapshot.docs.map(doc => {
            return {
              id: doc.id,
              ...doc.data(),
            } as Policy;
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

        // Fetch Recent Claims
        setLoadingClaims(true);
        try {
          const claimsRef = collection(db, "users", currentUser.uid, "claims");
          // Fetch most recent 3 claims
          const qClaims = query(claimsRef, orderBy("submissionDate", "desc"), limit(3));
          const claimsSnapshot = await getDocs(qClaims);
          const fetchedClaims = claimsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
          setDashboardClaims(fetchedClaims);
        } catch (error) {
          console.error("Error fetching claims for dashboard:", error);
          toast({ title: t('common.error'), description: t('dashboard.fetchClaimsError'), variant: "destructive" });
        } finally {
          setLoadingClaims(false);
        }

        // Placeholder for fetching real notification count
        // For now, set a mock value or 0
        // e.g., setNotificationsCount(await fetchNotificationCount(currentUser.uid));
        setNotificationsCount(0); // Or some mock value like 3

      } else {
        setLoadingPolicies(false);
        setLoadingVehicles(false);
        setLoadingClaims(false);
        setPolicies([]);
        setVehicles([]);
        setDashboardClaims([]);
        setNotificationsCount(0);
      }
    };

    if (!loadingAuth && currentUser) {
      fetchDashboardData();
    } else if (!loadingAuth && !currentUser) {
      setLoadingPolicies(false);
      setLoadingVehicles(false);
      setLoadingClaims(false);
      setPolicies([]);
      setVehicles([]);
      setDashboardClaims([]);
      setNotificationsCount(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, loadingAuth, t]);


  if (loadingAuth || (currentUser && (loadingProfile || loadingPolicies || loadingVehicles || loadingClaims))) {
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
            {notificationsCount > 0 && (
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
                  <PolicyCard key={policy.id} policy={policy} allVehicles={vehicles} />
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
            {loadingClaims ? (
                 <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : dashboardClaims.length > 0 ? (
              <div className="space-y-3">
                {dashboardClaims.map(claim => (
                  <DashboardClaimCard key={claim.id} claim={claim} allVehicles={vehicles} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
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

function getFormattedDate(dateInput: string | Timestamp | Date | undefined): string {
  if (!dateInput) return 'N/A';
  try {
    const date = dateInput instanceof Timestamp ? dateInput.toDate() : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput); // Fallback if not a valid date
    return date.toLocaleDateString(); // Uses user's locale
  } catch (e) {
    return String(dateInput); // Fallback
  }
}

function PolicyCard({ policy, allVehicles }: { policy: Policy; allVehicles: AppVehicle[] }) {
  const { t } = useLanguage();
  const displayEndDate = getFormattedDate(policy.endDate);
  
  let vehicleDisplayName = policy.type.charAt(0).toUpperCase() + policy.type.slice(1) + " Insurance"; // Default e.g. "Vehicle Insurance"
  if (policy.vehicleId && allVehicles && allVehicles.length > 0) {
    const linkedVehicle = allVehicles.find(v => v.id === policy.vehicleId);
    if (linkedVehicle) {
      vehicleDisplayName = `${linkedVehicle.make} ${linkedVehicle.model}`;
    } else if (policy.type === 'vehicle') {
        vehicleDisplayName = t('policyCard.genericVehiclePolicy');
    }
  }
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{vehicleDisplayName}</CardTitle>
        <CardDescription>{t('policyCard.policyNumberLabel')}: {policy.policyNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{t('policyCard.expiresLabel')}: <span className="font-medium">{displayEndDate}</span></p>
        <p className="text-sm">{t('policyCard.statusLabel')}: <span className={`font-medium ${policy.status === "active" ? "text-green-600" : (policy.status === "expired" ? "text-red-600" : "text-yellow-600")}`}>{t(`policyCard.statusValue.${policy.status}`, {defaultValue: policy.status})}</span></p>
      </CardContent>
      <CardFooter>
        <Button variant="link" className="p-0 h-auto text-primary" asChild>
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

function DashboardClaimCard({ claim, allVehicles }: { claim: Claim; allVehicles: AppVehicle[] }) {
  const { t } = useLanguage();
  const submissionDate = getFormattedDate(claim.submissionDate);

  let vehicleDisplayName = t('dashboard.claimCard.generalClaim');
  if (claim.vehicleId && allVehicles && allVehicles.length > 0) {
    const linkedVehicle = allVehicles.find(v => v.id === claim.vehicleId);
    if (linkedVehicle) {
      vehicleDisplayName = `${linkedVehicle.make} ${linkedVehicle.model}`;
    }
  }

  const getStatusColorAndText = (status: Claim['status']) => {
    switch (status) {
      case "submitted": return { color: "bg-blue-100 text-blue-700", text: t('claimStatus.submitted') };
      case "under_review": return { color: "bg-yellow-100 text-yellow-700", text: t('claimStatus.under_review') };
      case "information_requested": return { color: "bg-orange-100 text-orange-700", text: t('claimStatus.information_requested') };
      case "approved": return { color: "bg-sky-100 text-sky-700", text: t('claimStatus.approved') }; // Using sky for approved
      case "rejected": return { color: "bg-red-100 text-red-700", text: t('claimStatus.rejected') };
      case "settled": return { color: "bg-green-100 text-green-700", text: t('claimStatus.settled') };
      default: return { color: "bg-gray-100 text-gray-700", text: status };
    }
  };

  const statusStyle = getStatusColorAndText(claim.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <p className="font-medium">{vehicleDisplayName}</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.claimCard.claimNumberLabel')}: {claim.claimNumber}</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.claimCard.submittedOnLabel')}: {submissionDate}</p>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${statusStyle.color}`}>
          {statusStyle.text}
        </span>
      </CardContent>
      <CardFooter className="pt-0 pb-3 px-4">
         <Button variant="link" size="sm" className="p-0 h-auto text-primary" asChild>
            <Link href={`/claims/${claim.id}`}> 
                <span>{t('common.viewDetails')}</span>
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
