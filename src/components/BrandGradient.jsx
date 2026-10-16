import MotionGradient from '@/components/MotionGradient';

// PUBLIC's shared signature palette. Keep each channel neutral for true monochrome.
export const PUBLIC_GRADIENT_COLORS = Object.freeze(['#080808', '#ffffff', '#a6a6a6']);
export default function BrandGradient({className='',style}){
 return <MotionGradient className={className} style={style} colors={PUBLIC_GRADIENT_COLORS} speed={.65} pauseWhenCovered />;
}
