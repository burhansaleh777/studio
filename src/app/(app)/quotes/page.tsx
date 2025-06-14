
"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
import { QuoteForm } from "@/components/quotes/quote-form";
import { useLanguage } from "@/contexts/LanguageContext";

export default function QuotesPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHeader title={t('quotesPage.title')} backHref="/dashboard" />
      <PageContainer>
        <QuoteForm />
      </PageContainer>
    </>
  );
}

