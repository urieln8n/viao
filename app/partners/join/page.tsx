import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { PartnerJoinForm } from "./partner-join-form";

// UX-10 (Partners Visible + Discovery + Registration) — §12/§21: alta de
// Partner. Wrapper Server Component mínimo (mismo patrón que
// app/onboarding/page.tsx): el propio formulario, con estado, vive en un
// Client Component separado.
export default function PartnerJoinPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("partnerJoin.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("partnerJoin.valueProposition")}</p>
      </div>

      <PageContainer variant="narrow" className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>{t("partnerJoin.subtitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PartnerJoinForm />
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
