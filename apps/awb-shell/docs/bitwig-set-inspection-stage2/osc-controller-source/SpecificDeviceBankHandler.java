package com.armedwithbow;

import java.util.UUID;

import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.DeviceBank;
import com.bitwig.extension.controller.api.DeviceMatcher;

public class SpecificDeviceBankHandler {
    private DeviceMatcher matcher;
    public Device device;
    // public final DeviceBank deviceBank;

    SpecificDeviceBankHandler(ExtensionBase base, DeviceBank deviceBank, String deviceId, int bankIndex, int matcherType){
        switch(matcherType){
            case 0 : matcher = base.host.createBitwigDeviceMatcher(UUID.fromString(deviceId));
                break;
            case 1 : matcher = base.host.createVST3DeviceMatcher(deviceId);
                break;
            case 2 : matcher = base.host.createVST2DeviceMatcher(Integer.parseInt(deviceId));
                break;
            default : base.host.println("Device Id error");
            return;
        }
        deviceBank.setDeviceMatcher(matcher);
        device = deviceBank.getItemAt(bankIndex);
    }
}
