( function () {
  const group = {
    enabled: true,
    position: [ 0, 0, 0 ],
    rotation: [ 0, 0, 0 ],
    audioScale: 1.5,
    pointSize: 3,
    pointOpacity: 0.9,
    persistenceLength: 8000,
    persistenceDecay: 0.35,
    warpFactor: 0.1,
    masterBrightness: 1,
    testMode: true,
    frameRate: 60,
    depthScale: 0,
    colorSaturation: 1,
    colorRangeMin: 0,
    colorRangeMax: 1
  };

  globalThis.mountDistributionFixture = ( api, readyName ) => {
    const engine = api.createLissajousEngine( {
      canvas: document.querySelector( 'canvas' ),
      pixelRatio: 1,
      controls: 'none'
    } );
    engine.addGroup( readyName, group );
    engine.start();
    globalThis[ `${ readyName }Engine` ] = engine;
    globalThis[ `${ readyName }Ready` ] = true;
  };
}() );
