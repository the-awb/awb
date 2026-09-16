import NumberSlider from '../NumberSlider.jsx';
import { focalDistance } from '@awb/field-engine';

const GEOM_FIELDS = [
  [ 'sep', 'Speaker gap', 0.5, 4.0, 0.05, 2, ' m' ],
  [ 'spkH', 'Speaker height', 0.2, 2.0, 0.05, 2, ' m' ],
  [ 'bedH', 'Bed height', 0.1, 1.2, 0.05, 2, ' m' ],
  [ 'bedY', 'Bed distance', 0.0, 3.6, 0.05, 2, ' m' ],
  [ 'pistonA', 'Driver radius', 0.02, 0.15, 0.005, 3, ' m' ],
  [ 'roomDiam', 'Room diameter', 4.0, 14.0, 0.25, 2, ' m' ],
  [ 'roomBack', 'Behind speakers', 0.0, 4.0, 0.1, 2, ' m' ],
];

// Physical placement: where things are in space, including the slice position
// (that's "where you're looking," not "how it's drawn" -- rendering choices
// live in DisplayPanel instead).
export default function RoomPanel( { room, dispatch } ) {
  const update = ( key ) => ( value ) => dispatch( { type: 'UPDATE_ROOM', key, value } );
  const fd = focalDistance( room.conv, room.sep );

  return (
    <div className="panel">
      <h2>Room</h2>
      { GEOM_FIELDS.map( ( [ key, label, min, max, step, decimals, unit ] ) => (
        <NumberSlider
          key={ key } label={ label } value={ room[ key ] } min={ min } max={ max } step={ step }
          decimals={ decimals } unit={ unit } onChange={ update( key ) }
        />
      ) ) }

      <NumberSlider
        label="Convergence" value={ room.conv } min={ 0 } max={ 180 } step={ 1 } decimals={ 0 } unit="°"
        onChange={ update( 'conv' ) }
      />
      <p className="note" style={ { marginTop: 0 } }>
        { fd === Infinity
          ? 'Speakers parallel — focal point at infinity.'
          : `Speaker axes cross ${ fd.toFixed( 2 ) } m out.` }
      </p>

    </div>
  );
}
