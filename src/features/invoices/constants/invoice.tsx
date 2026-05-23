import * as React from "react";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreateIcon from "@mui/icons-material/Create";
import MailIcon from "@mui/icons-material/Mail";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import PaymentIcon from "@mui/icons-material/Payment";
import VisibilityIcon from "@mui/icons-material/Visibility";

export { CURRENCIES } from "@app/shared/config/currencies";
export { getStatusColor, STATUS_CONFIG } from "@app/shared/config/invoice-status";

export const EVENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> =
  {
    CREATED: {
      icon: <CreateIcon fontSize="small" />,
      label: "Invoice created",
      color: "text.secondary",
    },
    SENT: {
      icon: <MailIcon fontSize="small" />,
      label: "Invoice sent to client",
      color: "info.main",
    },
    VIEWED: {
      icon: <VisibilityIcon fontSize="small" />,
      label: "Viewed by client",
      color: "info.main",
    },
    PAID_MANUAL: {
      icon: <CheckCircleIcon fontSize="small" />,
      label: "Marked as paid",
      color: "success.main",
    },
    PAYMENT_RECORDED: {
      icon: <PaymentIcon fontSize="small" />,
      label: "Payment recorded",
      color: "success.main",
    },
    PAYMENT_DELETED: {
      icon: <MoneyOffIcon fontSize="small" />,
      label: "Payment deleted",
      color: "warning.main",
    },
  };
