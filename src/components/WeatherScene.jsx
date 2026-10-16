import MotionGradient from '@/components/MotionGradient';
import { PUBLIC_GRADIENT_COLORS } from '@/components/BrandGradient';
const palettes = {
 ambient:PUBLIC_GRADIENT_COLORS,
 sun:['#d17632','#efb06a','#668cae'],
 night:['#172755','#513b85','#1c526c'],
 'cloud-night':['#293577','#8a427d','#336b82'],
 rain:['#24587e','#6e4d9f','#29817a'],
 'rain-night':['#252858','#68417e','#24647a'],
 storm:['#20263f','#65557e','#344d68'],
 snow:['#819db7','#b6b0cb','#638f9f'],
 fog:['#6b7d87','#a099aa','#67858b'],
 cloud:['#56738e','#9b9aaa','#697e96'],
};
// Keep weather abstract: condition controls color and the pace of the flowing mesh.
const speeds={ambient:.7,sun:.9,night:.4,'cloud-night':.45,rain:.6,'rain-night':.5,storm:1.35,snow:.35,fog:.35,cloud:.55};
export default function WeatherScene({scene='ambient',brand=false}){
 const monochrome=brand || scene==='ambient';
 return <><MotionGradient className="atmosphere-gradient" colors={monochrome ? PUBLIC_GRADIENT_COLORS : palettes[scene] || palettes.ambient} speed={monochrome ? .65 : speeds[scene] ?? speeds.ambient} /><div className={'atmosphere-gradient-shade'+(monochrome?' atmosphere-gradient-shade--brand':'')} aria-hidden="true" /></>;
}

