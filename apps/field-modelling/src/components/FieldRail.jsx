// The tool's only navigation: a 48px icon rail at the shell's standard width, the same shape the
// other tools in the toolkit use. It replaces a 130px text tab column inside a bottom dock that was
// taking 35vh from the field itself - a canvas tool should give its canvas the window.
const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
};

export const InstrumentsIcon = ( props ) => <svg { ...base } { ...props }>
  <path d="M2.5 12h2.2l1.9-5.8 3 11.6 2.4-7.4 1.5 3.2h8" />
</svg>;

export const RoomIcon = ( props ) => <svg { ...base } { ...props }>
  <rect x="2.6" y="4.4" width="18.8" height="15.2" rx="1.6" />
  <circle cx="8.4" cy="12" r="1.4" fill="currentColor" stroke="none" />
  <path d="M11.4 8.7a4.6 4.6 0 0 1 0 6.6" />
  <path d="M14 6.9a8 8 0 0 1 0 10.2" opacity="0.55" />
</svg>;

export const MicrophonesIcon = ( props ) => <svg { ...base } { ...props }>
  <rect x="9.2" y="2.8" width="5.6" height="10.4" rx="2.8" />
  <path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0" />
  <path d="M12 17.6v3.6" />
</svg>;

const TABS = [
  { id: 'instruments', label: 'Instruments', Icon: InstrumentsIcon },
  { id: 'settings', label: 'Room and display', Icon: RoomIcon }
];

export default function FieldRail( {
  tab, onTab, panelOpen, onPanelOpen, microphonesOpen, onMicrophones
} ) {
  return <nav className="fieldRail" aria-label="Field Modelling context">
    { TABS.map( ( { id, label, Icon } ) => {
      const selected = panelOpen && tab === id;
      return <button key={ id } className={ `fieldRailButton${ selected ? ' isSelected' : '' }` }
        title={ label } aria-label={ label } aria-pressed={ selected }
        onClick={ () => {
          // Clicking the open panel's own icon collapses it, the way the other tools behave.
          if ( panelOpen && tab === id ) onPanelOpen( false );
          else { onTab( id ); onPanelOpen( true ); }
        } }>
        <Icon width="18" height="18" />
      </button>;
    } ) }
    <span className="fieldRailSpacer" />
    <button className={ `fieldRailButton${ microphonesOpen ? ' isSelected' : '' }` }
      title="Microphones" aria-label="Microphones" aria-pressed={ microphonesOpen }
      onClick={ () => onMicrophones( !microphonesOpen ) }>
      <MicrophonesIcon width="18" height="18" />
    </button>
  </nav>;
}
