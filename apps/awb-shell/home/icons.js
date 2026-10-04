// App marks and UI glyphs for the toolkit home. Each is a 24x24 stroke drawing that inherits
// currentColor, so a mark takes the tool's signature hue from the card it sits in.
// The Lissajous mark is a real 3:2 figure sampled from sin(3t + pi/2), sin(2t).
const AWB_ICONS = {
  'score-studio': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.6" y="5" width="9.4" height="3.6" rx="1.3"></rect>
    <rect x="6.2" y="10.2" width="12.4" height="3.6" rx="1.3"></rect>
    <rect x="4.2" y="15.4" width="7.6" height="3.6" rx="1.3"></rect>
    <path d="M16.8 3.2v17.6" stroke-dasharray="2 2.6" opacity="0.85"></path>
  </svg>`,
  'field-modelling': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.6" y="4.4" width="18.8" height="15.2" rx="1.6"></rect>
    <circle cx="8.4" cy="12" r="1.5" fill="currentColor" stroke="none"></circle>
    <path d="M11.4 8.7a4.6 4.6 0 0 1 0 6.6" opacity="0.9"></path>
    <path d="M14 6.9a8 8 0 0 1 0 10.2" opacity="0.6"></path>
    <path d="M16.6 5.1a11.4 11.4 0 0 1 0 13.8" opacity="0.32"></path>
  </svg>`,
  lissajous: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M 20.60 12.00 L 20.18 13.79 L 18.96 15.50 L 17.05 17.05 L 14.66 18.39 L 12.00 19.45 L 9.34 20.18 L 6.95 20.55 L 5.04 20.55 L 3.82 20.18 L 3.40 19.45 L 3.82 18.39 L 5.04 17.05 L 6.95 15.50 L 9.34 13.79 L 12.00 12.00 L 14.66 10.21 L 17.05 8.50 L 18.96 6.95 L 20.18 5.61 L 20.60 4.55 L 20.18 3.82 L 18.96 3.45 L 17.05 3.45 L 14.66 3.82 L 12.00 4.55 L 9.34 5.61 L 6.95 6.95 L 5.04 8.50 L 3.82 10.21 L 3.40 12.00 L 3.82 13.79 L 5.04 15.50 L 6.95 17.05 L 9.34 18.39 L 12.00 19.45 L 14.66 20.18 L 17.05 20.55 L 18.96 20.55 L 20.18 20.18 L 20.60 19.45 L 20.18 18.39 L 18.96 17.05 L 17.05 15.50 L 14.66 13.79 L 12.00 12.00 L 9.34 10.21 L 6.95 8.50 L 5.04 6.95 L 3.82 5.61 L 3.40 4.55 L 3.82 3.82 L 5.04 3.45 L 6.95 3.45 L 9.34 3.82 L 12.00 4.55 L 14.66 5.61 L 17.05 6.95 L 18.96 8.50 L 20.18 10.21 L 20.60 12.00 Z"></path>
  </svg>`,
  scope: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="4" width="19" height="16" rx="2"></rect>
    <path d="M4.5 12h2l2-5 3.5 10 3-7 2 2h2.5"></path>
  </svg>`,
  rack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="3" width="19" height="18" rx="2"></rect>
    <path d="M7 12v6m5-6v6m5-6v6M5.5 15h3m2-1h3m2 3h3"></path>
    <circle cx="7" cy="7.5" r="1.2"></circle><circle cx="12" cy="7.5" r="1.2"></circle><circle cx="17" cy="7.5" r="1.2"></circle>
  </svg>`,
  tool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.4"></rect>
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.4"></rect>
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4"></rect>
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4"></rect>
  </svg>`,
  engine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2.5 12h2.6l2.1-6.4 3.4 12.8 2.6-8.2 1.6 3.4h6.7"></path>
  </svg>`,
  view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.6" y="4.4" width="18.8" height="15.2" rx="1.8"></rect>
    <path d="M2.6 8.6h18.8"></path>
    <circle cx="5.6" cy="6.5" r="0.7" fill="currentColor" stroke="none"></circle>
  </svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3.6 21.2 19.6H2.8z"></path><path d="M12 9.8v4.4"></path>
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"></circle>
  </svg>`
};

const awbIcon = ( id ) => AWB_ICONS[ id ] ?? AWB_ICONS.tool;
