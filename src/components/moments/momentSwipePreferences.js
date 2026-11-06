export const PHOTO_AUTOPLAY = [
  { id: 'fast', label: 'Fast', delay: 2500 },
  { id: 'normal', label: 'Normal', delay: 4000 },
  { id: 'slow', label: 'Slow', delay: 6500 },
  { id: 'off', label: 'Off · manual swipe', delay: 0 },
];
export function photoAutoplayDelay(speed) {
  return PHOTO_AUTOPLAY.find((option) => option.id === speed)?.delay ?? 4000;
}
