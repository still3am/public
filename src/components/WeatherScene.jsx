import MotionGradient from '@/components/MotionGradient';
const palettes = {
 ambient:['#283d91','#b2498d','#287d82'],
 sun:['#b35b24','#ed9260','#455caa'],
 night:['#25358d','#8d3c92','#1e6c83'],
 'cloud-night':['#293577','#8a427d','#336b82'],
 rain:['#24587e','#6e4d9f','#29817a'],
 'rain-night':['#252858','#68417e','#24647a'],
 storm:['#34256d','#925270','#2c6478'],
 snow:['#456b8f','#8e74b1','#4b8f96'],
 fog:['#49637a','#9a7c93','#4a807c'],
 cloud:['#486a85','#ae738b','#5b728f'],
};
export default function WeatherScene({scene='ambient'}){
 return <><MotionGradient className="atmosphere-gradient" colors={palettes[scene] || palettes.ambient} speed={.85} /><div className="atmosphere-gradient-shade" aria-hidden="true" /></>;
}

