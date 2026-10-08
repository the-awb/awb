// Isolated Qt language host; does not boot an audio server.
AWBHostControl.start(\manual, \ide, "");
("AWB_QT_HOST_READY port=" ++ NetAddr.langPort).postln;
OSCdef(\testStationCount, {
    {
        var count = Window.allWindows.count { |window| window.name == "awb Workspace" };
        ("AWB_QT_STATION_OBSERVED windows=" ++ count).postln;
    }.defer(0.3);
}, '/awb/host/qt-station/open');
SystemClock.sched(60, {
    {
        AwbWorkspaceGUI.default !? { |station| station.close };
        AWBHostControl.stop;
        0.exit;
    }.defer;
    nil;
});
