import { useMemo, useRef, useState } from 'react';
import {
  bodySiteMicrophones,
  flattenChannels,
  resolveInstrumentColor,
  sampleColorReadings
} from '@awb/field-engine';

export default function MicrophonesPanel({ microphones, bodySurface, instruments, externals, room, timeFactor, displayGain, liveReadings = {}, defaultPosition = { x: 260, y: 112 } }) {
  const [position, setPosition] = useState(defaultPosition);
  const [meterMode, setMeterMode] = useState('colors');
  const dragRef = useRef(null);
  const bodyMicrophones = useMemo(() => bodySiteMicrophones(bodySurface, room), [bodySurface, room]);
  const allMicrophones = useMemo(() => [...microphones, ...bodyMicrophones], [microphones, bodyMicrophones]);
  // The same append the canvas does, for the same reason: the composite meter is computed from the
  // whole field, so a per-instrument breakdown that left console synths out would not sum to it.
  const all = useMemo(() => instruments, [instruments]);
  const channels = useMemo(() => flattenChannels(all, room.speakers, timeFactor, 0), [all, room.speakers, timeFactor]);

  return (
    <div
      className="panel microphonesPanel floatingMicPanel"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <h2
        className="floatingMicHandle"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, panelX: position.x, panelY: position.y };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          const width = 300, visibleHandle = 44;
          setPosition({
            x: Math.max(-width + visibleHandle, Math.min(window.innerWidth - visibleHandle, drag.panelX + event.clientX - drag.pointerX)),
            y: Math.max(0, Math.min(window.innerHeight - visibleHandle, drag.panelY + event.clientY - drag.pointerY)),
          });
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
      >Microphones <span>drag</span></h2>
      <div className="seg micModeSwitch" role="group" aria-label="Microphone meter mode">
        <button className={meterMode === 'composite' ? 'on' : ''} onClick={() => setMeterMode('composite')}>Composite</button>
        <button className={meterMode === 'colors' ? 'on' : ''} onClick={() => setMeterMode('colors')}>Per colour</button>
      </div>
      <div className="micList">
        {allMicrophones.map((microphone) => {
          const fallback = sampleColorReadings(channels, room, microphone.position, displayGain);
          const reading = liveReadings[microphone.id] ?? {
            composite: fallback.composite,
            instruments: Object.fromEntries(fallback.instruments),
          };
          const meters = new Map(Object.entries(reading.instruments));
          return (
            <div className="micRow" key={microphone.id}>
              <div className="micName"><span className={'micKind ' + microphone.subtype} />{microphone.label}</div>
              <div className="micMeters">
                {meterMode === 'composite' ? (
                  <div className="micMeterTrack" title={`Composite: ${(reading.composite.colorIntensity * 100).toFixed(1)}% colour level; amplitude ${reading.composite.amplitude.toFixed(4)}`}>
                    <div className="micMeterFill" style={{ width: `${reading.composite.colorIntensity * 100}%`, background: reading.composite.color, boxShadow: `0 0 7px ${reading.composite.color}` }} />
                  </div>
                ) : all.map((instrument, index) => {
                  const reading = meters.get(instrument.id);
                  const intensity = reading?.colorIntensity ?? 0;
                  const color = resolveInstrumentColor(instrument, index);
                  return (
                    <div className="micMeterTrack" key={instrument.id} title={`${instrument.external ? `\\${instrument.defName} (console)` : instrument.type}: ${(intensity * 100).toFixed(1)}% colour level; amplitude ${(reading?.amplitude ?? 0).toFixed(4)}`}>
                      <div className="micMeterFill" style={{ width: `${intensity * 100}%`, background: color, boxShadow: `0 0 7px ${color}88` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="note">{meterMode === 'composite' ? 'One aggregate field bar per microphone.' : 'One bar per instrument colour.'} Room-array points are cyan; body-attached points are white.</p>
    </div>
  );
}
