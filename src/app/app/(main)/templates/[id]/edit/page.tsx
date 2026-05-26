"use client";

import { useParams, useRouter } from "next/navigation";

import { Alert, Box, Button } from "@mui/material";

import { AppLayout } from "@app/shared/layout/app-layout";
import { Breadcrumbs } from "@app/shared/ui/breadcrumbs";
import { CardSkeleton } from "@app/shared/ui/skeletons";

import { useSenderProfile } from "@app/features/settings";
import { mapTemplateToFormData, useTemplate } from "@app/features/templates";
import { TemplateForm } from "@app/features/templates/components";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = String(params.id);
  const { data: template, isLoading, error } = useTemplate(templateId);
  const { data: senderProfile } = useSenderProfile();

  if (isLoading) {
    return (
      <AppLayout>
        <CardSkeleton />
      </AppLayout>
    );
  }

  if (error || !template) {
    return (
      <AppLayout>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Failed to load template. Please try again.
        </Alert>

        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => router.push("/app/templates")}>
            Back to Templates
          </Button>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumbs
        items={[
          { label: "Templates", href: "/app/templates" },
          { label: template.name },
          { label: "Edit" },
        ]}
      />

      <TemplateForm
        mode="edit"
        templateId={templateId}
        defaultCurrency={senderProfile?.defaultCurrency}
        initialData={mapTemplateToFormData(template)}
      />
    </AppLayout>
  );
}
