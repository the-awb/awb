// Continuous audio taper: zero is silence; unity is the top of the live fader.
export const faderGain=(position,min=0,max=1)=>min+(max-min)*Math.max(0,Math.min(1,position))**3;
export const faderPosition=(gain,min=0,max=1)=>Math.cbrt(Math.max(0,Math.min(1,(gain-min)/(max-min))));
export const gainLabel=gain=>gain<=0?'−∞ dB':`${(20*Math.log10(gain)).toFixed(1)} dB`;
