package com.armedwithbow;

import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.Device;

public class EnvFollowerOscObserver {
    private double lastValue;

    public Device device;
    public final String address;
    public final CursorRemoteControlsPage remoteControlsPage;

    EnvFollowerOscObserver(Device device, ExtensionBase base, String moduleName, int index) {
        this.device = device;
        this.address = String.format("/envelopes/%s/%d", moduleName, index);
        this.lastValue = -1;

        base.host.println(address);
        remoteControlsPage = device.createCursorRemoteControlsPage(8);
        base.host.println(String.valueOf(remoteControlsPage.getParameterCount()));

        remoteControlsPage.getParameter(0).modulatedValue().markInterested();

        remoteControlsPage.getParameter(0).modulatedValue().addValueObserver(value -> {

            double roundValue = Math.round(value * 512.0) / 512.0; // 4x oversampling compared to midi
            // if (Math.abs(value - lastValue) > 0.003) { // is we want to send fewer
            // messages, use this
            if (roundValue != lastValue) {
                lastValue = roundValue;
                base.sendOscMessage(address, lastValue);
            }

        });

        // busFaders[i].setBinding(base.bus_fader_bank.getItemAt(busses[i]).volume());
        // // new - control gain
    }

}
