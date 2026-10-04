package com.armedwithbow;

import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.DeviceBank;
import com.bitwig.extension.controller.api.DeviceMatcher;

import java.util.UUID;

public class InstrumentLayerHandler {
    private final DeviceMatcher matcher;
    public final DeviceBank instBank;

    InstrumentLayerHandler(ExtensionBase base, DeviceBank sourceDeviceBank) {
        matcher = base.host.createBitwigDeviceMatcher(UUID.fromString("5024be2e-65d6-4d40-bbfe-8b2ea993c445"));
        sourceDeviceBank.setDeviceMatcher(this.matcher);
        instBank = sourceDeviceBank;

    }

    DeviceBank getLayerDeviceBank(ExtensionBase base, int bankIndex, int layerSize, int layerI, int bankSize) {
        return instBank.getItemAt(bankIndex).createLayerBank(layerSize).getItemAt(layerI).createDeviceBank(bankSize);
    }

    Device getInstDevice(int bankIndex) {
        return instBank.getItemAt(bankIndex);
    }
}
