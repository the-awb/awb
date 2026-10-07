// Public AWBase dictionary names; the delay DSP owns no parameters.
export const delayKnobNames={inputGain:'inOf',dryLevel:'dryOf',effectLevel:'fxOf',feedback:'fbOf'};
export function delayKnobID(cell,field,head){
 const prefix=String(cell).toLowerCase();
 if(!['b1','b2','a1','a2'].includes(prefix))return null;
 return head&&/^h[1-4]$/.test(head)&&field==='amount'?`${prefix}/${head}Amount`:delayKnobNames[field]?`${prefix}/${delayKnobNames[field]}`:null;
}
export function delayKnobIDs(cell){return [...Object.keys(delayKnobNames).map(f=>delayKnobID(cell,f)),...[1,2,3,4].map(n=>delayKnobID(cell,'amount',`h${n}`))];}
