
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Car, Shield, Bell, LogOut, Edit3, PlusCircle, Loader2, ImageOff } from "lucide-react";
import Link from "next/link";
import { AddVehicleForm } from "@/components/profile/add-vehicle-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import type { UserProfile as AppUserProfile, Vehicle } from '@/lib/types';
import { collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";


export default function ProfilePage() {
  const { currentUser, userProfile, loadingAuth, loadingProfile } = useAuth();
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchVehicles = useCallback(async () => {
    if (!currentUser) {
      setLoadingVehicles(false);
      return;
    }
    setLoadingVehicles(true);
    try {
      const vehiclesRef = collection(db, "users", currentUser.uid, "vehicles");
      const q = query(vehiclesRef, orderBy("createdAt", "desc"));
      
      // Using getDocs for a one-time fetch, or onSnapshot for real-time
      // For simplicity here, let's use getDocs and call fetchVehicles after adding.
      const querySnapshot = await getDocs(q);
      const vehiclesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setUserVehicles(vehiclesData);

    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast({ title: t('common.error'), description: t('profilePage.fetchVehiclesError'), variant: "destructive" });
      setUserVehicles([]); // Clear vehicles on error
    } finally {
      setLoadingVehicles(false);
    }
  }, [currentUser, toast, t]);

  useEffect(() => {
    if (currentUser) {
      fetchVehicles();
    } else if (!loadingAuth) { // If auth loading is done and no current user
      setUserVehicles([]);
      setLoadingVehicles(false);
    }
  }, [currentUser, loadingAuth, fetchVehicles]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: t('auth.toast.logoutSuccessTitle') });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: t('auth.toast.logoutErrorTitle'), variant: "destructive" });
    }
  };

  if (loadingAuth || loadingProfile) {
    return (
      <PageContainer className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </PageContainer>
    );
  }

  if (!currentUser || !userProfile) {
    return (
        <PageContainer>
            <Card>
                <CardHeader>
                    <CardTitle>{t('common.error')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{t('profilePage.loadError')}</p>
                    <Button asChild className="mt-4"><Link href="/login">{t('auth.loginButton')}</Link></Button>
                </CardContent>
            </Card>
        </PageContainer>
    );
  }

  const { fullName, email, phone } = userProfile as AppUserProfile & {fullName?: string};

  return (
    <>
      <PageHeader title={t('profilePage.title')} />
      <PageContainer>
        <div className="grid gap-8">
          {/* User Info Card */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={userProfile.avatarUrl || `https://placehold.co/100x100.png?text=${(fullName || email || 'U').substring(0,2).toUpperCase()}`} alt={fullName || email || 'User'} data-ai-hint="profile picture"/>
                <AvatarFallback className="text-2xl bg-muted">{(fullName || email || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{fullName || t('profilePage.notSet')}</CardTitle>
                <CardDescription>{email} &bull; {phone || t('profilePage.notSet')}</CardDescription>
              </div>
              <Button variant="outline" size="icon" className="ml-auto" disabled>
                <Edit3 className="h-4 w-4" />
                <span className="sr-only">{t('profilePage.editProfileButton')}</span>
              </Button>
            </CardHeader>
          </Card>

          {/* Vehicle Management */}
          <Card className="shadow-lg" id="vehicles">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center"><Car className="mr-2 h-5 w-5 text-primary" /> {t('profilePage.myVehiclesTitle')}</CardTitle>
                <Dialog open={showAddVehicleForm} onOpenChange={setShowAddVehicleForm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" /> {t('profilePage.addVehicleButton')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle>{t('addVehicleForm.title')}</DialogTitle> {/* Changed to use AddVehicleForm title key */}
                    </DialogHeader>
                    <AddVehicleForm onVehicleAdded={() => {
                      setShowAddVehicleForm(false);
                      fetchVehicles(); // Re-fetch vehicles after one is added
                    }} />
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>{t('profilePage.myVehiclesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVehicles ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userVehicles.length > 0 ? (
                <div className="space-y-4">
                  {userVehicles.map(vehicle => (
                    <Card key={vehicle.id} className="flex items-center p-3 hover:shadow-md transition-shadow">
                       {vehicle.imageUrl ? (
                        <Image
                            src={vehicle.imageUrl}
                            alt={`${vehicle.make} ${vehicle.model}`}
                            width={64}
                            height={48}
                            className="rounded-md object-cover mr-4"
                            data-ai-hint="vehicle side"
                        />
                        ) : (
                        <div className="w-16 h-12 rounded-md bg-muted flex items-center justify-center mr-4">
                            <ImageOff className="h-6 w-6 text-muted-foreground" data-ai-hint="vehicle placeholder" />
                        </div>
                        )}
                      <div className="flex-grow">
                        <h4 className="font-semibold">{vehicle.make} {vehicle.model} ({vehicle.year})</h4>
                        <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
                      </div>
                      <Button variant="ghost" size="sm" disabled>{t('common.edit')}</Button> {/* Edit vehicle functionality to be implemented */}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('profilePage.noVehiclesAdded')}</p>
              )}
            </CardContent>
          </Card>

          {/* Settings & Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{t('profilePage.settingsAndActionsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingsLink href="/profile/edit" icon={User} label={t('profilePage.editProfileInfoLink')} disabled />
              <SettingsLink href="/policies" icon={Shield} label={t('profilePage.managePoliciesLink')} />
              <SettingsLink href="/notifications/preferences" icon={Bell} label={t('profilePage.notificationPreferencesLink')} disabled />
              <SettingsLink href="/privacy" icon={Shield} label={t('profilePage.privacyDataLink')} disabled />
            </CardContent>
            <CardContent className="mt-4 border-t pt-6">
               <Button variant="destructive" className="w-full sm:w-auto" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> {t('profilePage.logoutButton')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

function SettingsLink({ href, icon: Icon, label, disabled = false }: { href: string, icon: React.ElementType, label: string, disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <Button variant="outline" asChild className="justify-start text-left h-auto py-3" disabled={disabled}>
      <Link href={href}>
        <Icon className="mr-3 h-5 w-5 text-muted-foreground" />
        <span className="flex-grow">{label}</span>
         {disabled && <span className="text-xs text-muted-foreground ml-auto">({t('common.comingSoon')})</span>}
      </Link>
    </Button>
  );
}

    