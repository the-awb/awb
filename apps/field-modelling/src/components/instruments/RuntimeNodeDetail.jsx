import NumberSlider from '../NumberSlider.jsx';
import { instrumentBooleanFields, instrumentFields, typeForSynthDef } from '@awb/instruments';

const RESERVED_CONTROLS = new Set( [ 'out', 'gate' ] );

export default function RuntimeNodeDetail( { node, speakers, onSetControl, onCommand } ) {
  if ( !node ) return <div className="panel"><h2>Runtime synth</h2>
    <p className="note">This NodeManager entry is no longer present.</p></div>;

  const known = typeForSynthDef( node.synthDefName );
  const descriptor = known?.descriptor;
  const controls = node.controls ?? {};
  const present = new Set( Object.keys( controls ) );
  const numeric = ( name ) => typeof controls[ name ] === 'number';
  const fields = known ? instrumentFields( known.key, speakers )
    .filter( ( field ) => field.path.length === 1 && present.has( field.path[ 0 ] ) && numeric( field.path[ 0 ] ) ) : [];
  const booleans = known ? instrumentBooleanFields( known.key, speakers )
    .filter( ( field ) => field.path.length === 1 && present.has( field.path[ 0 ] ) && numeric( field.path[ 0 ] ) ) : [];
  const curated = new Set( [ ...fields.map( ( field ) => field.path[ 0 ] ),
    ...booleans.map( ( field ) => field.path[ 0 ] ) ] );
  const described = new Map( ( node.synthDefInterface?.controls ?? [] )
    .map( ( control ) => [ control.name, control ] ) );
  const rest = [ ...present ].filter( ( name ) => !RESERVED_CONTROLS.has( name ) && !curated.has( name ) );
  const canSet = node.actions?.setControl === true;

  return <div className="panel">
    <h2>{ node.synthDefName }</h2>
    <p className="note" style={ { marginTop: 0 } }>
      NodeManager entry <code>{ node.entryID }</code> · { node.ownership }. { known
        ? <>This is the same SynthDef as a { descriptor.label } instrument, so its declared Field
          controls use the same ranges and labels.</>
        : <>Its controls are inspectable, but no acoustic Field projection has been declared.</> }
    </p>
    { ( node.actions?.release || node.actions?.free ) && <div className="row"><label>Stop</label><div className="seg">
      { node.actions.release && <button onClick={ () => onCommand?.( node.entryID, 'release' ) }>Rel</button> }
      { node.actions.free && <button onClick={ () => onCommand?.( node.entryID, 'free' ) }>Free</button> }
    </div></div> }
    { fields.map( ( field ) => <NumberSlider key={ field.path[ 0 ] } label={ field.label }
      value={ controls[ field.path[ 0 ] ] } min={ field.min } max={ field.max } step={ field.step }
      decimals={ field.decimals } unit={ field.unit }
      disabled={ !canSet }
      onChange={ ( value ) => onSetControl?.( node.entryID, field.path[ 0 ], value ) } /> ) }
    { booleans.map( ( field ) => {
      const on = controls[ field.path[ 0 ] ] >= 0.5;
      return <div className="row" key={ field.path[ 0 ] }><label>{ field.label }</label><div className="boolSlot">
        <button className={ on ? 'on' : '' } disabled={ !canSet }
          onClick={ () => onSetControl?.( node.entryID, field.path[ 0 ], on ? 0 : 1 ) }>
          { on ? field.onLabel : field.offLabel }
        </button>
      </div></div>;
    } ) }
    { fields.length === 0 && booleans.length === 0 && rest.length === 0
      && <p className="note">No detailed control values are available.</p> }
    { rest.length > 0 && known && <h2 style={ { marginTop: 16 } }><span className="note"
      style={ { margin: 0, fontWeight: 'normal' } }>{ rest.length } more control{ rest.length === 1 ? '' : 's' }
      {' '}without a Field-specific editor</span></h2> }
    { rest.map( ( name ) => {
      const value = controls[ name ];
      const description = described.get( name );
      const locked = !canSet || Array.isArray( value ) || typeof value === 'string';
      return <div className="row" key={ name }>
        <label title={ description?.roles?.join( ', ' ) || name }>{ name }{ Array.isArray( value ) ? `[${ value.length }]` : '' }</label>
        <input type={ locked ? 'text' : 'number' } step="any" readOnly={ locked }
          value={ Array.isArray( value ) ? value.join( ', ' ) : ( value ?? '' ) }
          onChange={ ( event ) => {
            const next = Number( event.target.value );
            if ( Number.isFinite( next ) ) onSetControl?.( node.entryID, name, next );
          } }
          style={ { width: 90, background: '#222', color: locked ? '#777' : '#ccc',
            border: '1px solid #444', borderRadius: 3, padding: '1px 4px', fontSize: 11,
            fontFamily: 'monospace' } } />
      </div>;
    } ) }
  </div>;
}
