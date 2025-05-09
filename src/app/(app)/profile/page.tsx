"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Car, Shield, Bell, LogOut, Edit3, PlusCircle } from "lucide-react";
import Link from "next/link";
import { AddVehicleForm } from "@/components/profile/add-vehicle-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";


// Mock data
const userProfile = {
  name: "Juma Hamisi",
  email: "juma.hamisi@example.com",
  phone: "0712345678",
  avatarUrl: "https://picsum.photos/seed/juma/100/100",
};

const userVehicles = [
  { id: "v1", make: "Toyota", model: "IST", year: 2010, registration: "T123 ABC", imageUrl: "https://picsum.photos/seed/istcar/100/70" },
  { id: "v2", make: "Nissan", model: "March", year: 2012, registration: "T456 XYZ", imageUrl: "https://picsum.photos/seed/marchcar/100/70" },
];


export default function ProfilePage() {
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);

  return (
    <>
      <PageHeader title="My Profile" />
      <PageContainer>
        <div className="grid gap-8">
          {/* User Info Card */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} data-ai-hint="profile picture" />
                <AvatarFallback className="text-2xl bg-muted">{userProfile.name.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
                <CardDescription>{userProfile.email} &bull; {userProfile.phone}</CardDescription>
              </div>
              <Button variant="outline" size="icon" className="ml-auto">
                <Edit3 className="h-4 w-4" />
                <span className="sr-only">Edit Profile</span>
              </Button>
            </CardHeader>
          </Card>

          {/* Vehicle Management */}
          <Card className="shadow-lg" id="vehicles">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center"><Car className="mr-2 h-5 w-5 text-primary" /> My Vehicles</CardTitle>
                <Dialog open={showAddVehicleForm} onOpenChange={setShowAddVehicleForm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle>Add New Vehicle</DialogTitle>
                    </DialogHeader>
                    <AddVehicleForm onVehicleAdded={() => setShowAddVehicleForm(false)} />
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>Manage your registered vehicles and their documents.</CardDescription>
            </CardHeader>
            <CardContent>
              {userVehicles.length > 0 ? (
                <div className="space-y-4">
                  {userVehicles.map(vehicle => (
                    <Card key={vehicle.id} className="flex items-center p-3 hover:shadow-md transition-shadow">
                      <Image 
                        src={vehicle.imageUrl} 
                        alt={`${vehicle.make} ${vehicle.model}`} 
                        width={64} 
                        height={48} 
                        className="rounded-md object-cover mr-4"
                        data-ai-hint="vehicle side"
                      />
                      <div className="flex-grow">
                        <h4 className="font-semibold">{vehicle.make} {vehicle.model} ({vehicle.year})</h4>
                        <p className="text-sm text-muted-foreground">{vehicle.registration}</p>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No vehicles added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Settings & Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Settings & Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingsLink href="/profile/edit" icon={User} label="Edit Profile Info" />
              <SettingsLink href="/policies" icon={Shield} label="Manage Policies" />
              <SettingsLink href="/notifications/preferences" icon={Bell} label="Notification Preferences" />
              <SettingsLink href="/privacy" icon={Shield} label="Privacy & Data" />
            </CardContent>
            <CardContent className="mt-4 border-t pt-6">
               <Button variant="destructive" className="w-full sm:w-auto">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

function SettingsLink({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) {
  return (
    <Button variant="outline" asChild className="justify-start text-left h-auto py-3">
      <Link href={href}>
        <Icon className="mr-3 h-5 w-5 text-muted-foreground" />
        <span className="flex-grow">{label}</span>
      </Link>
    </Button>
  );
}
