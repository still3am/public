import {useCoverPalette} from '@/hooks/useCoverPalette';
export function useReleaseTheme(url){
 const {colors}=useCoverPalette(url);
 const color=colors.find(c=>/^#[0-9a-f]{6}$/i.test(c))||'#343438';
 return {'--release-surface':`color-mix(in srgb, ${color} 28%, #121214)`};
}
