// Curated, vibrant two-color gradients for genre browse cards (Apple-Music style).
const CURATED = {
  "Hip-Hop": ["#7B2FF7", "#00D4FF"],
  "Pop": ["#FF5F9E", "#FF8A3D"],
  "Electronic": ["#00D2FF", "#3A7BD5"],
  "R&B": ["#6A3093", "#A044FF"],
  "Afrobeats": ["#FF8008", "#FFC837"],
  "Amapiano": ["#00B4DB", "#0083B0"],
  "Dance": ["#FC466B", "#3F5EFB"],
  "House": ["#8E2DE2", "#4A00E0"],
  "Techno": ["#2C1B47", "#7B61FF"],
  "Trap": ["#360033", "#0B486B"],
  "Drill": ["#0F2027", "#2C5364"],
  "Lo-Fi": ["#7F00FF", "#E100FF"],
  "Ambient": ["#2E3192", "#1BFFFF"],
  "Jazz": ["#F7971E", "#FFD200"],
  "Soul": ["#FF512F", "#F9D423"],
  "Funk": ["#FC5C7D", "#6A82FB"],
  "Rock": ["#2C3E50", "#FD2D55"],
  "Reggae": ["#00B09B", "#96C93D"],
  "Latin": ["#F857A6", "#FF8008"],
  "K-Pop": ["#FF5F9E", "#FFB6C1"],
  "Reggaeton": ["#FF416C", "#FF4B2B"],
  "Phonk": ["#231F20", "#6A0DAD"],
  "Drum & Bass": ["#1488CC", "#2B32B2"],
  "Synthwave": ["#DA22FF", "#9733EE"],
  "Disco": ["#FB5607", "#FF006E"],
  "Metal": ["#232526", "#A00000"],
  "Punk": ["#F00000", "#44424F"],
  "Country": ["#D38312", "#FFD08C"],
  "Indie": ["#11998E", "#38EF7D"],
  "Folk": ["#C24914", "#FFB75E"],
  "Classical": ["#536976", "#292E49"],
  "World": ["#2193B0", "#6DD5ED"],
  "Afrosoul": ["#E44D26", "#FDA085"],
  "Vaporwave": ["#DA22FF", "#48C6EF"],
  "Gqom": ["#0F2027", "#E44D26"],
};

export const CURATED_ORDER = Object.keys(CURATED);

const PALETTE = [
  ["#FF5F9E", "#FF8A3D"],
  ["#7B2FF7", "#00D4FF"],
  ["#11998E", "#38EF7D"],
  ["#FC466B", "#3F5EFB"],
  ["#FF512F", "#F9D423"],
  ["#8E2DE2", "#4A00E0"],
  ["#0F2027", "#2C5364"],
  ["#F857A6", "#FF8008"],
  ["#2E3192", "#1BFFFF"],
  ["#DA22FF", "#9733EE"],
  ["#2193B0", "#6DD5ED"],
  ["#6A3093", "#A044FF"],
  ["#00B09B", "#96C93D"],
  ["#FD2D55", "#2C3E50"],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function gradientFor(genre) {
  if (CURATED[genre]) return CURATED[genre];
  return PALETTE[hash(genre) % PALETTE.length];
}