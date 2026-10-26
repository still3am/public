export function profileCommentFilter(profileId, mediaKey = "") {
  return mediaKey ? {profile_id: profileId, media_key: mediaKey} :
    {profile_id: profileId, $or: [{media_key: {$exists: false}}, {media_key: ""}, {media_key: null}]};
}
export function isProfileCommentThread(row, profileId, mediaKey = "") {
  return row?.profile_id === profileId && (row.media_key || "") === mediaKey;
}
