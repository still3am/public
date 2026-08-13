import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const DEFAULT_MESSAGES = [
  "Made by the people, for the people.",
  "New Music Weekly",
];

// Reads (and lets admins edit) the scrolling banner messages stored in AppSetting.
export function useBannerMessages() {
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

  async function setMessages(messages) {
    if (setting) {
      const updated = await base44.entities.AppSetting.update(setting.id, {
        banner_messages: messages,
      });
      setSetting(updated);
    } else {
      const created = await base44.entities.AppSetting.create({
        banner_messages: messages,
      });
      setSetting(created);
    }
  }

  const custom = setting?.banner_messages?.filter(Boolean) || [];
  const messages = custom.length > 0 ? custom : DEFAULT_MESSAGES;

  return {
    loading,
    messages,
    isCustom: custom.length > 0,
    setMessages,
  };
}