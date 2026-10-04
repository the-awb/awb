package com.armedwithbow;

import com.bitwig.extension.controller.api.ControllerHost;

import java.io.IOException;
import java.util.Map;

import com.armedwithbow.FXLayerHandler;
import com.armedwithbow.InstrumentLayerHandler;
import com.bitwig.extension.controller.ControllerExtension;
import com.bitwig.extension.controller.api.HardwareSurface;
import com.bitwig.extension.controller.api.MasterTrack;
import com.bitwig.extension.controller.api.DeviceBank;

/*
 *    TO RUN: mvn install
 */

public class OSCControllerforAWBExtension extends ControllerExtension {

      private ExtensionBase base; // Make it a class field instead of a local variable
      private final int TOTAL_BUS_TRACKS = 18; // tracks that are just BUS OUT
      private final int TOTAL_FX_TRACKS = 6; // FX tracks

      private final int FX_TRACKBANK_START = 21;

      private final int FX_SENDS_START = 0;
      private final int FX_SENDS_END = FX_SENDS_START + TOTAL_FX_TRACKS - 1;
      private final int BUS_SENDS_START = FX_SENDS_END + 1;
      private final int BUS_SENDS_END = BUS_SENDS_START + TOTAL_BUS_TRACKS;

      private final int SCENE_SLOTS = 50;

      private HardwareSurface hardwareSurface;

      protected OSCControllerforAWBExtension(final OSCControllerforAWBExtensionDefinition definition,
                  final ControllerHost host) {
            super(definition, host);
      }

      @Override
      public void init() {
            this.base = new ExtensionBase(getHost(), TOTAL_BUS_TRACKS, TOTAL_FX_TRACKS, BUS_SENDS_START,
                        FX_SENDS_START, BUS_SENDS_END, SCENE_SLOTS);

            this.hardwareSurface = base.extensionHardwareSurface;

            /*
             * Uses Interface groups for groups of tracks
             */

            ///////////////////////////////////
            // 0. Create the constants
            /////////////////////////////////

            // MAKE SCENE DICT

            InterfaceGroup audio_in = new InterfaceGroup(base, "audio source lines", "mixed", 13, 0, 0,
                        true);
            InterfaceGroup fx_1 = new InterfaceGroup(base, "fx 1", "mixed", FX_TRACKBANK_START + base.TOTAL_FX_TRACKS,
                        FX_TRACKBANK_START, 0, true);

            audio_in.addModule("vcfx", 2, 1, new int[] {}, false, true, false, false); // vc + ubermod
            audio_in.addModule("vcin", 3, 0, new int[] { 0, 1, 2, 3 }, true, false, false, true); // vc + ubermod
            audio_in.addModule("pro2", 5, 7, new int[] { 16 }, true, true, false, true); // p2

            audio_in.addModule("b1", 9, 2, new int[] { 4 }, true, true, false, true);
            audio_in.addModule("a1", 10, 3, new int[] { 5 }, true, true, false, true);
            audio_in.addModule("a2", 11, 4, new int[] { 6 }, true, true, false, true);
            audio_in.addModule("b2", 12, 5, new int[] { 7 }, true, true, false, true);
            audio_in.addModule("bus", 8, 6, new int[] {}, true, true, true, false);

            fx_1.addModule("splut", 0, 8, new int[] { 9 }, true, false, false, true);
            fx_1.addModule("spark", 1, 10, new int[] { 11 }, true, false, false, true);
            fx_1.addModule("deci", 2, 11, new int[] { 12 }, true, false, false, true);
            fx_1.addModule("fuzz", 3, 12, new int[] { 13 }, true, false, false, true);
            fx_1.addModule("verb", 4, 13, new int[] { 14 }, true, false, false, true);
            fx_1.addModule("mast", 5, 14, new int[] { 15, 10, 8 }, true, false, false, true);

            /////////////////////////////////////////////////////////////////////////////////////
            // 1. Create the controls

            // 1.1 Create input controls

            // FXLayerHandler is a wrapper to an FXLayer device on the track by ID
            // InstrumentLayerHandler is a wrapper to an InstrumentLayer device on the track
            // by ID

            // fx layer for groups for vc and p2
            FXLayerHandler vcFXBank = new FXLayerHandler(base, audio_in.modulesMap.get("vcfx").createDeviceBank(1));
            FXLayerHandler pro2FXBank = new FXLayerHandler(base, audio_in.modulesMap.get("pro2").createDeviceBank(1));

            // instrument Layers for delays
            InstrumentLayerHandler b1InstBank = new InstrumentLayerHandler(base,
                        audio_in.modulesMap.get("b1").createDeviceBank(2));
            InstrumentLayerHandler b2InstBank = new InstrumentLayerHandler(base,
                        audio_in.modulesMap.get("b2").createDeviceBank(2));
            InstrumentLayerHandler a1InstBank = new InstrumentLayerHandler(base,
                        audio_in.modulesMap.get("a1").createDeviceBank(2));
            InstrumentLayerHandler a2InstBank = new InstrumentLayerHandler(base,
                        audio_in.modulesMap.get("a2").createDeviceBank(2));

            // FX layers for FX chains
            FXLayerHandler sparkFXBank = new FXLayerHandler(base, fx_1.modulesMap.get("spark").createDeviceBank(1));
            FXLayerHandler splutterFXBank = new FXLayerHandler(base, fx_1.modulesMap.get("splut").createDeviceBank(1));

            // master track for Master
            MasterTrack masterTrack = base.host.createMasterTrack(0); // setting scenes - here. Change in future ??
            DeviceBank masterRootFXBank = masterTrack.createDeviceBank(3);
            FXLayerHandler masterFXBank1 = new FXLayerHandler(base, masterRootFXBank); // top level
            FXLayerHandler masterFXBank2 = new FXLayerHandler(base, masterFXBank1.getLayerDeviceBank(base, 0, 1, 0, 4)); // inner

            audio_in.modulesMap.get("b1").addRoutingDeviceMapper(base,
                        audio_in.modulesMap.get("b1").createDeviceBank(1).getItemAt(0));
            audio_in.modulesMap.get("b1").addModDeviceMapper(base, "b1 compelx mod", b1InstBank.getInstDevice(0),
                        0);
            audio_in.modulesMap.get("b1").addParamDeviceMapper(base, "b1 control",
                        b1InstBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            audio_in.modulesMap.get("b1").addParamDeviceMapper(base, "b1 time",
                        b1InstBank.getLayerDeviceBank(base, 0, 1, 0, 2).getItemAt(1), 1);
            // audio_in.modulesMap.get("b1").addParamDeviceMapper(base, "b1 enveloper",
            // audio_in.modulesMap.get("b1").createDeviceBank(3).getItemAt(2), 2);

            audio_in.modulesMap.get("a1").addRoutingDeviceMapper(base,
                        audio_in.modulesMap.get("a1").createDeviceBank(1).getItemAt(0));
            audio_in.modulesMap.get("a1").addModDeviceMapper(base, "a1 compelx mod", a1InstBank.getInstDevice(0),
                        0);
            audio_in.modulesMap.get("a1").addParamDeviceMapper(base, "a1 control",
                        a1InstBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            audio_in.modulesMap.get("a1").addParamDeviceMapper(base, "a1 time",
                        a1InstBank.getLayerDeviceBank(base, 0, 1, 0, 2).getItemAt(1), 1);

            audio_in.modulesMap.get("a2").addRoutingDeviceMapper(base,
                        audio_in.modulesMap.get("a2").createDeviceBank(1).getItemAt(0));
            audio_in.modulesMap.get("a2").addModDeviceMapper(base, "a2 compelx mod", a2InstBank.getInstDevice(0),
                        0);
            audio_in.modulesMap.get("a2").addParamDeviceMapper(base, "a2 control",
                        a2InstBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            audio_in.modulesMap.get("a2").addParamDeviceMapper(base, "a2 time",
                        a2InstBank.getLayerDeviceBank(base, 0, 1, 0, 2).getItemAt(1), 1);

            audio_in.modulesMap.get("b2").addRoutingDeviceMapper(base,
                        audio_in.modulesMap.get("b2").createDeviceBank(1).getItemAt(0));
            audio_in.modulesMap.get("b2").addModDeviceMapper(base, "b2 compelx mod", b2InstBank.getInstDevice(0),
                        0);
            audio_in.modulesMap.get("b2").addParamDeviceMapper(base, "b2 control",
                        b2InstBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            audio_in.modulesMap.get("b2").addParamDeviceMapper(base, "b2 time",
                        b2InstBank.getLayerDeviceBank(base, 0, 1, 0, 2).getItemAt(1), 1);

            audio_in.modulesMap.get("vcfx").addParamDeviceMapper(base, "vc params", vcFXBank.getFXDevice(0), 0);
            audio_in.modulesMap.get("pro2").addParamDeviceMapper(base, "p2 params", pro2FXBank.getFXDevice(0), 0);

            fx_1.modulesMap.get("deci").addParamDeviceMapper(base, "deci",
                        fx_1.modulesMap.get("deci").createDeviceBank(1).getItemAt(0), 0);

            fx_1.modulesMap.get("fuzz").addParamDeviceMapper(base, "fuzz",
                        fx_1.modulesMap.get("fuzz").createDeviceBank(1).getItemAt(0), 0);

            fx_1.modulesMap.get("splut").addParamDeviceMapper(base, "splutter control",
                        splutterFXBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            fx_1.modulesMap.get("splut").addModDeviceMapper(base, "splutter mod", splutterFXBank.getFXDevice(0), 0);

            fx_1.modulesMap.get("spark").addParamDeviceMapper(base, "spark control",
                        sparkFXBank.getLayerDeviceBank(base, 0, 1, 0, 1).getItemAt(0), 0);
            fx_1.modulesMap.get("spark").addModDeviceMapper(base, "spark mod", sparkFXBank.getFXDevice(0), 0);

            fx_1.modulesMap.get("verb").addParamDeviceMapper(base, "verb params",
                        fx_1.modulesMap.get("verb").createDeviceBank(1).getItemAt(0), 0);

            fx_1.modulesMap.get("mast").addParamDeviceMapper(base, "mast params", masterFXBank1.fxBank.getItemAt(0), 0);

            fx_1.modulesMap.get("mast").addParamDeviceMapper(base, "um control",
                        masterFXBank2.getLayerDeviceBank(base, 1, 1, 0, 1).getItemAt(0), 1);
            fx_1.modulesMap.get("mast").addModDeviceMapper(base, "um mod", masterFXBank2.fxBank.getItemAt(1), 1);

            fx_1.modulesMap.get("mast").addParamDeviceMapper(base, "stut 2", masterFXBank1.fxBank.getItemAt(1), 2);

            // audio_in.modulesMap.get("pro2").track.clipLauncherSlotBank();
            audio_in.modulesMap.get("pro2").createSceneMapper(base, 20);

            base.host.showPopupNotification("OSC Controller for AWB Initialized");

            base.host.println("OSC Controller for AWB Initialized");

      }

      @Override
      public void exit() {
            // TODO: Perform any cleanup once the driver exits
            // For now just show a popup notification for verification that it is no longer
            // running.
            getHost().showPopupNotification("OSC Controller for AWB Exited");
      }

      // In your main controller extension class that extends ControllerExtension
      @Override
      public void flush() {
            // Send any pending OSC messages as a bundle
            if (this.base != null && !this.base.pendingOscMessages.isEmpty()) {
                  // getHost().println("Sending bundle with " +
                  // this.base.pendingOscMessages.size() + " messages");

                  try {
                        this.base.oscConnection.startBundle();

                        for (Map.Entry<String, Double> entry : this.base.pendingOscMessages.entrySet()) {
                              String address = entry.getKey();
                              Double value = entry.getValue();
                              this.base.oscConnection.sendMessage(address, value);
                              getHost().println(" - Bundled: " + address + " -> " + value);
                        }

                        this.base.oscConnection.endBundle();
                        // getHost().println("Bundle sent successfully");

                        // Important: clear after successful sending
                        this.base.pendingOscMessages.clear();
                  } catch (IOException e) {
                        getHost().println("ERROR: Failed to send OSC bundle: " + e.getMessage());
                        getHost().println(e.toString()); // Print the full exception
                  }
            }
            if (this.hardwareSurface != null)
                  this.hardwareSurface.updateHardware();
      }

}
