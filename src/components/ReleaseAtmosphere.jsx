import MotionGradient from '@/components/MotionGradient';
// The same viewport-sized folding color field used by the Made for You mixes.
export default function ReleaseAtmosphere({theme}){
 const colors=['--release-color-one','--release-color-two','--release-color-three'].map(key=>theme[key]);
 return <div className="release-atmosphere" aria-hidden="true"><MotionGradient colors={colors} speed={1.05} pauseWhenCovered className="release-motion-gradient"/><div className="release-atmosphere-shade"/></div>;
}
