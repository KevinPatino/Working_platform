export interface TenantConfig {
  company: {
    name: string;
    shortName: string;
    logoUrl: string;
  };
  colors: {
    primary: string;
    primaryHover: string;
    // Resaltado de quincenas y reportes
    accent: string;
    accentLight: string;
    // Estados del personal
    success: string;
    successLight: string;
    danger: string;
    dangerLight: string;
    warning: string;
    warningLight: string;
  };
  payroll: {
    anchorDate: string;
    cycleDays: number;
  };
}

export const currentTenant: TenantConfig = {
  company: {
    name: "Western Trades Work Platform",
    shortName: "Western Trades",
    logoUrl: "/logo.png",
  },
  colors: {
    // Marca principal
    primary: "#8cc641",
    primaryHover: "#6ea62a",

    // Acento para quincenas y reportes (actualmente morado)
    accent: "#9333ea",
    accentLight: "#faf5ff",

    // Estados
    success: "#16a34a",       // Verde de "Worked" y "Today"
    successLight: "#dcfce7",
    danger: "#dc2626",        // Rojo de "No Log" y "Log Out"
    dangerLight: "#fee2e2",
    warning: "#ca8a04",       // Fines de semana
    warningLight: "#fef9c3",
  },
  payroll: {
    anchorDate: "2026-08-31",
    cycleDays: 14,
  },
};

export const applyTenantTheme = (tenant: TenantConfig = currentTenant) => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--color-brand-primary", tenant.colors.primary);
    root.style.setProperty("--color-brand-hover", tenant.colors.primaryHover);
    root.style.setProperty("--color-brand-accent", tenant.colors.accent);
    root.style.setProperty("--color-brand-accent-light", tenant.colors.accentLight);
    root.style.setProperty("--color-status-success", tenant.colors.success);
    root.style.setProperty("--color-status-success-light", tenant.colors.successLight);
    root.style.setProperty("--color-status-danger", tenant.colors.danger);
    root.style.setProperty("--color-status-danger-light", tenant.colors.dangerLight);
    root.style.setProperty("--color-status-warning", tenant.colors.warning);
    root.style.setProperty("--color-status-warning-light", tenant.colors.warningLight);
  }
};

applyTenantTheme();