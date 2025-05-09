import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { NewClaimWizard } from "@/components/claims/new-claim-wizard";

export default function NewClaimPage() {
  return (
    <>
      <PageHeader title="Submit a New Claim" backHref="/claims" />
      <PageContainer>
        <NewClaimWizard />
      </PageContainer>
    </>
  );
}
