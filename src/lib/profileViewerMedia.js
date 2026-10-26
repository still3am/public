import { AVATAR_PRESETS } from "./avatarPresets.js";
import { withPresetAvatar } from "./nativeAvatar.js";

// Match the exact visible avatar, including gallery GIFs and preset overrides.
export function profileViewerMedia(user) {
  const profile = withPresetAvatar(user) || {};
  const poster = profile.avatar_url || "/avatars/default-headphones.webp";
  const gallery = AVATAR_PRESETS.find((item) => item.url === poster);
  const video = profile.avatar_video_url || gallery?.videoUrl || "";
  const gif = profile.avatar_gif_url || gallery?.gifUrl || "";
  return { poster, source: video || gif || poster, type: video ? "video" : gif || /\.gif(?:[?#]|$)/i.test(poster) ? "gif" : "image" };
}

// Stable thread per original avatar asset; changing the avatar starts a new thread.
export function profileMediaKey(media) {
  const value = media.type + ":" + media.source;
  let a = 2166136261, b = 2246822507;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b ^ value.charCodeAt(i), 3266489909);
  }
  return "avatar:" + media.type + ":" + [a,b].map(n => (n >>> 0).toString(16).padStart(8,"0")).join("");
}
