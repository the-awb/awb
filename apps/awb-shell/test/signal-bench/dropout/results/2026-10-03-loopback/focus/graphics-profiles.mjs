// Fixed display fan-out over the same sixteen audio buses. No production limits change.
export const graphicsProfiles = Object.freeze({
 widgets: {widgets:128,size:96,widgetHz:15,canvases:0,width:0,height:0,paintHz:0},
 'mixed-16-30': {widgets:128,size:48,widgetHz:15,canvases:16,width:256,height:64,paintHz:30},
 'mixed-64-30': {widgets:128,size:48,widgetHz:15,canvases:64,width:256,height:64,paintHz:30},
 'mixed-128-60': {widgets:512,size:24,widgetHz:15,canvases:128,width:128,height:48,paintHz:60},
});
export function graphicsProfile(condition) {
 if(['stopped','stopped-focus'].includes(condition))return null;
 if(['focus','focus-noop','spawn-noop'].includes(condition))return graphicsProfiles.widgets;
 const profile=graphicsProfiles[condition];
 if(!profile)throw new Error('Unknown dropout condition '+condition);
 return profile;
}
