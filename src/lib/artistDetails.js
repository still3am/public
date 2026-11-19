const text = value => value == null ? '' : String(value).trim();

export function artistDetailDate(value) {
  const raw = text(value);
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(raw);
  if (!match || !match[2]) return raw;
  const date = new Date(raw.slice(0,7) + '-' + (match[3] || '01') + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.getUTCMonth() + 1 !== Number(match[2]) || match[3] && date.getUTCDate() !== Number(match[3])) return raw;
  return new Intl.DateTimeFormat(undefined, {year:'numeric',month:'long',...(match[3] ? {day:'numeric'} : {}),timeZone:'UTC'}).format(date);
}

export function artistDetailRows(artist, info) {
  const seen = new Set();
  const genres = text(info?.genres || artist.catalogGenres).split(/\s*·\s*/).filter(value => {
    const key = value.trim().toLowerCase();
    if (!key || ['other','unknown','unknown genre'].includes(key) || seen.has(key)) return false;
    seen.add(key);return true;
  });
  const person = info?.type === 'Person';
  return [
    {label:'Artist',value:person ? 'Solo artist' : text(info?.type),icon:'artist'},
    {label:'From',value:text(artist.location || info?.origin || info?.area),icon:'location'},
    {label:artist.formed_year ? (person ? 'Active since' : 'Formed') : person ? 'Born' : 'Formed',value:artistDetailDate(artist.formed_year || info?.begin),icon:'calendar'},
    {label:'Members',value:text(artist.members),icon:'members'},
    {label:'Ended',value:artistDetailDate(info?.end),icon:'calendar'},
    {label:'Genres',value:genres,icon:'genres'}
  ].filter(row => Array.isArray(row.value) ? row.value.length : row.value);
}
