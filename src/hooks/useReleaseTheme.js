import {useCoverPalette} from '@/hooks/useCoverPalette';
export function useReleaseTheme(url){
 const {colors}=useCoverPalette(url);
 const palette=colors.filter(c=>/^#[0-9a-f]{6}$/i.test(c));
 const color=palette[0]||'#343438';
 return {'--release-surface':`color-mix(in srgb, ${color} 28%, #121214)`,'--release-color-one':color,'--release-color-two':palette[1]||'#687080','--release-color-three':palette[2]||'#55505f'};
}
