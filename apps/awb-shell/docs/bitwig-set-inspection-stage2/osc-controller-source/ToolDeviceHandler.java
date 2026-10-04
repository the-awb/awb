package com.armedwithbow;

import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.DeviceBank;
import java.util.UUID;
import com.bitwig.extension.controller.api.DeviceMatcher;

public class ToolDeviceHandler {
    private final DeviceMatcher matcher;
    public final DeviceBank toolBank;

    ToolDeviceHandler(ExtensionBase base, DeviceBank sourceDeviceBank) {
        matcher = base.host.createBitwigDeviceMatcher(UUID.fromString("e67b9c56-838d-4fba-8e3e-ae4e02cccbcb"));

        sourceDeviceBank.setDeviceMatcher(this.matcher);
        toolBank = sourceDeviceBank;
    }

    Device getToolDevice(int bankIndex) {

        return toolBank.getItemAt(bankIndex);
    }

}
