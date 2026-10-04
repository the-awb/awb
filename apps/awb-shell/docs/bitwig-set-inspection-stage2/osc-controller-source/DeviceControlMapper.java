package com.armedwithbow;

import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.AbsoluteHardwareKnob;

/*
 * Takes a Device and maps it to the midi values for a given DynamicTrackModule  and MIDIBASE
 */
public class DeviceControlMapper {
    private final CursorRemoteControlsPage remoteControlsPage;
    static final int BANKSIZE = 8;
    public final AbsoluteHardwareKnob[] paramKnobs;

    DeviceControlMapper(ExtensionBase base, Device device, String name, DynamicTrackModule mod, int MIDI_BASE_CC) {
        remoteControlsPage = device.createCursorRemoteControlsPage(BANKSIZE);

        paramKnobs = new AbsoluteHardwareKnob[BANKSIZE];

        for (int i = 0; i < BANKSIZE; i++) {
            paramKnobs[i] = base.extensionHardwareSurface
                    .createAbsoluteHardwareKnob("ABS_KNOB_" + name.toUpperCase() + "_DEVICE_P" + i);
            paramKnobs[i].setAdjustValueMatcher(
                    base.scPortIn.createAbsoluteCCValueMatcher(mod.midiChannel, MIDI_BASE_CC + i));
            paramKnobs[i].setBinding(remoteControlsPage.getParameter(i));
            remoteControlsPage.getParameter(i).displayedValue().addValueObserver(val -> {
                base.host.println(val);
            });
        }
        ;

    }
}
