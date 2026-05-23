"use client";

import AddIcon from "@mui/icons-material/Add";
import { Button } from "@mui/material";

import { RESPONSIVE_SX } from "@app/shared/config/config";
import { HelpTooltip } from "@app/shared/ui/help-tooltip";
import { ListErrorState } from "@app/shared/ui/list-error-state";
import { MobileFab } from "@app/shared/ui/mobile-fab";
import { PageHeader } from "@app/shared/ui/page-header";

import { useTemplatesPage } from "../hooks/use-templates-page";
import { calculateEstimatedTotal } from "../lib/calculations";
import { TemplatesContent } from "./templates-content";
import { TemplatesOverflowMenu } from "./templates-overflow-menu";
import { TemplatesSearchBar } from "./templates-search-bar";

export function TemplatesPageContent() {
  const state = useTemplatesPage();
  const {
    isLoading,
    error,
    refetch,
    sortedTemplates,
    allTemplatesCount,
    searchQuery,
    setSearchQuery,
    menuAnchorEl,
    selectedTemplate,
    sortColumn,
    sortDirection,
    handleMenuOpen,
    handleMenuClose,
    handleDelete,
    handleEdit,
    handleUseTemplate,
    handleSort,
    navigateToNewTemplate,
  } = state;

  const header = (
    <PageHeader
      title={
        <>
          Invoice Templates
          <HelpTooltip title="Templates are reusable invoice blueprints with predefined items, tax rates, and due dates. Click 'Use Template' to create a new invoice from any template." />
        </>
      }
      subtitle="Create reusable templates to speed up invoice creation"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={navigateToNewTemplate}
          sx={RESPONSIVE_SX.DESKTOP_MD_ONLY}
        >
          New Template
        </Button>
      }
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ListErrorState entity="templates" onRetry={() => void refetch()} />
      </>
    );
  }

  return (
    <>
      {header}

      {!isLoading && allTemplatesCount > 0 && (
        <TemplatesSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredCount={sortedTemplates?.length ?? 0}
          totalCount={allTemplatesCount}
        />
      )}

      <TemplatesContent
        isLoading={isLoading}
        templates={sortedTemplates}
        allTemplatesCount={allTemplatesCount}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery("")}
        onUseTemplate={handleUseTemplate}
        onMenuOpen={handleMenuOpen}
        onCreateTemplate={navigateToNewTemplate}
        calculateEstimatedTotal={calculateEstimatedTotal}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      <TemplatesOverflowMenu
        anchorEl={menuAnchorEl}
        onClose={handleMenuClose}
        selectedTemplate={selectedTemplate}
        onUseTemplate={handleUseTemplate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <MobileFab icon={<AddIcon />} onClick={navigateToNewTemplate} label="New Template" />
    </>
  );
}
