import {base44} from '@/api/base44Client';
import {findLyricsCatalog} from './lyricsCatalog.js';
import {createSharedLyricsService} from './sharedLyrics.js';
export const getPublicLyrics=createSharedLyricsService(base44,findLyricsCatalog,detail=>window.dispatchEvent(new CustomEvent('lyrics:cache-status',{detail})));
