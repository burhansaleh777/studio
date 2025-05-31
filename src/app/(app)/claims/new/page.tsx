// @ts-nocheck
"use client"; // Added this line

import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { NewClaimWizard } from "@/components/claims/new-claim-wizard";
import { useLanguage } from "@/contexts/LanguageContext"; // Added this line

export default function NewClaimPage() {
  const { t } = useLanguage(); // Added this line

  return (
    <>
      <PageHeader title={t('newClaimWizard.pageTitle')} backHref="/claims" /> {/* Modified this line */}
      <PageContainer>
        <NewClaimWizard />
      </PageContainer>
    </>
  );
}
