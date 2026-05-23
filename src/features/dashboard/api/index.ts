import { fetchApi } from "@app/shared/api/base";
import { type AnalyticsData, analyticsDataSchema } from "@app/shared/schemas/api";

export type {
  AnalyticsData,
  CurrencyMetrics,
  MonthlyRevenue,
  RecentInvoice,
} from "@app/shared/schemas/api";

export const analyticsApi = {
  get: () => fetchApi<AnalyticsData>("/api/analytics", undefined, analyticsDataSchema),
};
