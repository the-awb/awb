import assert from 'node:assert/strict';
import { formatTimelineTime, timelineTicks, timelineTickStep } from '../src/engine/timelineScale.js';

assert.equal( timelineTickStep( 1 ), 100 );
assert.equal( timelineTickStep( 22 ), 5 );
assert.equal( timelineTickStep( 160 ), 0.5 );
assert.ok( timelineTickStep( 1 ) * 1 >= 72 );
assert.ok( timelineTickStep( 22 ) * 22 >= 72 );
assert.ok( timelineTickStep( 160 ) * 160 >= 72 );

const fitted = timelineTicks( 900, 1 );
assert.equal( fitted.step, 100 );
assert.equal( fitted.values.length, 10 );
assert.equal( fitted.values.at( -1 ), 900 );

assert.equal( formatTimelineTime( 100, 100 ), '1:40' );
assert.equal( formatTimelineTime( 3660, 60 ), '1:01:00' );
assert.equal( formatTimelineTime( 1.5, 0.5 ), '0:01.5' );

console.log( 'timeline-scale: 12/12 pass' );
