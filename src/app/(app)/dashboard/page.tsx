import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Car, FilePlus2, FileText, MessageSquare, PlusCircle, ShieldCheck, CreditCard } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Mock data - replace with actual data fetching
const user = {
  name: "Juma Hamisi",
  notificationsCount: 3,
};

const policies = [
  { id: "1", vehicleName: "Toyota IST", policyNumber: "BIMA-001", expiryDate: "2024-12-31", status: "Active" },
  { id: "2", vehicleName: "Nissan March", policyNumber: "BIMA-002", expiryDate: "2025-03-15", status: "Active" },
];

const recentClaims = [
  { id: "C1", vehicleName: "Toyota IST", status: "Under Review", date: "2024-07-10" },
];

const vehicles = [
  { id: "V1", name: "Toyota IST", model: "2010", plate: "T123 ABC", imageUrl:"https://picsum.photos/seed/toyotaist/100/70" },
  { id: "V2", name: "Nissan March", model: "2012", plate: "T456 XYZ", imageUrl:"https://picsum.photos/seed/nissanmarch/100/70"  },
];


export default function DashboardPage() {
  return (
    <>
      <PageHeader title={`Welcome, ${user.name}!`}>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {user.notificationsCount > 0 && (
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
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickActionCard href="/claims/new" icon={FilePlus2} label="Start Claim" />
              <QuickActionCard href="/quotes" icon={ShieldCheck} label="Get Quote" />
              <QuickActionCard href="/payments" icon={CreditCard} label="Make Payment" />
              <QuickActionCard href="/chat" icon={MessageSquare} label="Support Chat" />
            </div>
          </section>

          {/* My Policies */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">My Policies</h2>
              <Button variant="outline" size="sm" asChild>
                <Link href="/policies">View All</Link>
              </Button>
            </div>
            {policies.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {policies.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">You have no active policies.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/quotes">Get a Quote</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
          
          {/* My Vehicles */}
           <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">My Vehicles</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile#vehicles" className="flex items-center">
                  <PlusCircle className="h-4 w-4 mr-1" /> Add Vehicle
                </Link>
              </Button>
            </div>
            {vehicles.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {vehicles.map(vehicle => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">No vehicles added yet.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/profile#vehicles">Add Your Vehicle</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>


          {/* Recent Claims Activity */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Recent Claims</h2>
             {recentClaims.length > 0 ? (
              <div className="space-y-3">
                {recentClaims.map(claim => (
                  <Card key={claim.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{claim.vehicleName}</p>
                        <p className="text-sm text-muted-foreground">Submitted: {claim.date}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        claim.status === "Under Review" ? "bg-yellow-100 text-yellow-700" : 
                        claim.status === "Settled" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {claim.status}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">No recent claim activity.</p>
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
      <Card className="hover:bg-accent/10 hover:shadow-lg transition-all duration-200">
        <CardContent className="flex flex-col items-center justify-center p-4 aspect-square">
          <Icon className="h-8 w-8 text-primary mb-2" />
          <span className="text-sm font-medium text-center">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function PolicyCard({ policy }: { policy: (typeof policies)[0] }) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{policy.vehicleName}</CardTitle>
        <CardDescription>Policy: {policy.policyNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Expires: <span className="font-medium">{policy.expiryDate}</span></p>
        <p className="text-sm">Status: <span className={`font-medium ${policy.status === "Active" ? "text-green-600" : "text-red-600"}`}>{policy.status}</span></p>
      </CardContent>
      <CardFooter>
        <Button variant="link" className="p-0 h-auto text-primary" asChild>
          <Link href={`/policies/${policy.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function VehicleCard({ vehicle }: { vehicle: (typeof vehicles)[0] }) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow overflow-hidden">
       <div className="flex items-center p-4">
        <Image 
          src={vehicle.imageUrl} 
          alt={vehicle.name} 
          width={80} 
          height={56} 
          className="rounded-md object-cover mr-4"
          data-ai-hint="vehicle side"
        />
        <div className="flex-1">
          <CardTitle className="text-lg">{vehicle.name}</CardTitle>
          <CardDescription>{vehicle.model} - {vehicle.plate}</CardDescription>
           <Button variant="link" size="sm" className="p-0 h-auto text-primary mt-1" asChild>
            <Link href={`/profile#vehicle-${vehicle.id}`}>Manage</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
