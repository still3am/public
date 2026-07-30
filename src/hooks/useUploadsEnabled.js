import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Reads (and lets admins flip) the global uploads kill switch.
export function useUploadsEnabled() {
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await base44.entities.AppSetting.list("-created_date", 1).catch(() => []);
    setSetting(rows?.[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setEnabled(enabled) {
    if (setting) {
      const updated = await base44.entities.AppSetting.update(setting.id, {
        uploads_enabled: enabled,
      });
      setSetting(updated);
    } else {
      const created = await base44.entities.AppSetting.create({ uploads_enabled: enabled });
      setSetting(created);
    }
  }

  return {
    loading,
    enabled: setting ? setting.uploads_enabled !== false : true,
    setEnabled,
  };
}