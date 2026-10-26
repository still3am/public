import { AVATAR_PRESETS } from "./avatarPresets.js";
import { withPresetAvatar } from "./nativeAvatar.js";

// Match the exact visible avatar, including gallery GIFs and preset overrides.
export function profileViewerMedia(user) {
  const profile = withPresetAvatar(user) || {};
  const poster = profile.avatar_url || "/avatars/default-headphones.webp";
  const gallery = AVATAR_PRESETS.find((item) => item.url === poster);
  const video = profile.avatar_video_url || "";
  const gif = profile.avatar_gif_url || gallery?.gifUrl || "";
  return { poster, source: video || gif || poster, type: video ? "video" : gif || /\.gif(?:[?#]|$)/i.test(poster) ? "gif" : "image" };
}
