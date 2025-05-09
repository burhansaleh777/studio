import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus2, AlertTriangle, CheckCircle, Hourglass } from "lucide-react";
import Link from "next/link";

// Mock data for claims list
const claims = [
  { id: "1", policyNumber: "BIMA-001", vehicle: "Toyota IST", dateSubmitted: "2024-07-15", status: "Under Review", claimNumber: "CLM-2024-001" },
  { id: "2", policyNumber: "BIMA-002", vehicle: "Nissan March", dateSubmitted: "2024-06-20", status: "Settled", claimNumber: "CLM-2024-002" },
  { id: "3", policyNumber: "BIMA-001", vehicle: "Toyota IST", dateSubmitted: "2024-05-01", status: "Rejected", claimNumber: "CLM-2024-003" },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Under Review":
      return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case "Settled":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "Rejected":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default:
      return <Hourglass className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Under Review":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Settled":
      return "bg-green-100 text-green-700 border-green-300";
    case "Rejected":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}


export default function ClaimsPage() {
  return (
    <>
      <PageHeader title="Your Claims">
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/claims/new">
            <FilePlus2 className="mr-2 h-4 w-4" /> New Claim
          </Link>
        </Button>
      </PageHeader>
      <PageContainer>
        {claims.length > 0 ? (
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{claim.vehicle}</CardTitle>
                      <CardDescription>Claim #{claim.claimNumber} (Policy: {claim.policyNumber})</CardDescription>
                    </div>
                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(claim.status)}`}>
                      {getStatusIcon(claim.status)}
                      <span className="ml-1.5">{claim.status}</span>
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground">Submitted: {claim.dateSubmitted}</p>
                  <div className="mt-3 border-t pt-3">
                     {/* Simplified Timeline Placeholder */}
                    <ol className="relative border-s border-gray-200 dark:border-gray-700 ml-1">                  
                        <li className="mb-4 ms-4">
                            <div className={`absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-white ${claim.status === "Submitted" || claim.status === "Under Review" || claim.status === "Settled" ? 'bg-primary' : 'bg-gray-300'}`}></div>
                            <time className="mb-1 text-xs font-normal leading-none text-muted-foreground">Step 1</time>
                            <h3 className="text-sm font-semibold">Submitted</h3>
                        </li>
                        <li className="mb-4 ms-4">
                            <div className={`absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-white ${claim.status === "Under Review" || claim.status === "Settled" ? 'bg-primary' : 'bg-gray-300'}`}></div>
                            <time className="mb-1 text-xs font-normal leading-none text-muted-foreground">Step 2</time>
                            <h3 className="text-sm font-semibold">Under Review</h3>
                        </li>
                        <li className="ms-4">
                           <div className={`absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-white ${claim.status === "Settled" ? 'bg-green-500' : (claim.status === "Rejected" ? 'bg-red-500' : 'bg-gray-300')}`}></div>
                            <time className="mb-1 text-xs font-normal leading-none text-muted-foreground">Step 3</time>
                            <h3 className="text-sm font-semibold">{claim.status === "Rejected" ? "Decision Made" : "Settled/Finalized"}</h3>
                        </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <ShieldQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Claims Found</h3>
              <p className="text-muted-foreground mb-6">
                You haven&apos;t submitted any claims yet. If you need to, you can start a new claim.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/claims/new">
                  <FilePlus2 className="mr-2 h-4 w-4" /> Submit Your First Claim
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </>
  );
}
