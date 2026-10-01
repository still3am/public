import { base44 } from "@/api/base44Client";

// Reporting a track writes a real Report record for the admin queue — the same
// behaviour from every surface that offers the action.
export async function reportTrack({ trackId, reporterId }) {
  if (!trackId || !reporterId) return false;
  const reason = window.prompt("What's wrong with this track?");
  if (!reason || !reason.trim()) return false;
  try {
    await base44.entities.Report.create({
      reporter_id: reporterId,
      track_id: trackId,
      reason: reason.trim(),
    });
    window.alert("Thanks — a report was sent to the PUBLIC admin team.");
    return true;
  } catch {
    window.alert("Could not submit report. Try again later.");
    return false;
  }
}