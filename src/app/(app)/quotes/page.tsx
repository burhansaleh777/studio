
"use client";

import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/shared/page-container";
// We import useLanguage to keep the structure similar, but won't use t() directly for the title yet.
import { useLanguage } from "@/contexts/LanguageContext";

export default function QuotesPage() {
  // const { t } = useLanguage(); // Temporarily comment out to simplify

  return (
    <>
      {/* Use a static title for now to rule out translation issues */}
      <PageHeader title="Get a Quote (Test)" backHref="/dashboard" />
      <PageContainer>
        <div>
          <h1 className="text-2xl font-bold mb-4">Quotes Page Works!</h1>
          <p>If you are seeing this message, the basic structure of the Quotes page is loading correctly.</p>
          <p className="mt-4">The original QuoteForm component is temporarily not rendered here for testing purposes.</p>
        </div>
      </PageContainer>
    </>
  );
}
