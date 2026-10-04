package com.armedwithbow;

import com.bitwig.extension.controller.api.AbsoluteHardwareKnob;
import com.bitwig.extension.controller.api.HardwareSlider;
import com.bitwig.extension.controller.api.Track;
import com.bitwig.extension.controller.api.SendBank;
import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.DeviceBank;

// Main Class

// UI Module class
public class DynamicTrackModule {
   private DeviceControlMapper[] deviceParamMappers;
   private DeviceControlMapper[] deviceModMappers;
   private DeviceControlMapper[] deviceRoutingMappers;
   private TrackSceneMapper trackSceneMapper;
   private EnvFollowerOscObserver[] envFollowerOscObservers;

   private AbsoluteHardwareKnob[] busKnobs;
   private AbsoluteHardwareKnob[] fxKnobs;
   private HardwareSlider[] busFaders;
   private AbsoluteHardwareKnob[] busGainKnobs;
   private HardwareSlider fader;

   public final int index;
   public final String name;
   public final int midiChannel;
   public int[] busses;
   public Track track;
   public SendBank sends;

   /**
    * Constructor.
    *
    * @param index                   the track index for the fx / audio relative to
    *                                the
    *                                appropriate scope
    * @param name                    name of the UI module
    * @param channel                 midi channel for the module
    * @param busses                  the indexes of the associated bus channels
    * @param mapBussesSends          map bus sends
    * @param mapFxSends              map fx sends
    * @param mapFader                map fader of primary track
    * @param track                   the track
    * @param mapBusEnvelopeFollowers try to map an envelope follower for each bus
    *                                tracks
    * 
    */

   DynamicTrackModule(ExtensionBase base, int index, String name, int channel, int[] busses, Boolean mapBussesSends,
         Boolean mapFxSends, Boolean mapFader, Track track, Boolean mapBusEnvelopeFollowers) {
      this.index = index;
      this.name = name;
      this.midiChannel = channel;
      this.busses = busses;
      this.deviceParamMappers = new DeviceControlMapper[3];
      this.deviceModMappers = new DeviceControlMapper[3];
      this.deviceRoutingMappers = new DeviceControlMapper[1];
      this.track = track;
      if (mapBusEnvelopeFollowers) {
         envFollowerOscObservers = new EnvFollowerOscObserver[busses.length];
         createBusEnvelopeObservers(base);
      } else {
         envFollowerOscObservers = new EnvFollowerOscObserver[0];
      }

      if (mapBussesSends || mapFxSends) {
         this.setupSends(base, mapBussesSends, mapFxSends);
      }

      if (busses.length > 0) {
         this.createBusFaderMappings(base);
      }

      if (mapFader) {
         this.createFaderMapping(base);
      }

      if (mapBusEnvelopeFollowers) {

      }

   }

   DeviceBank createDeviceBank(int bankSize) {
      return track.createDeviceBank(bankSize);
   }

   public void createSceneMapper(ExtensionBase base, int size) {
      trackSceneMapper = new TrackSceneMapper(base, this, size);
   }

   public void addParamDeviceMapper(ExtensionBase base, String name, Device device, int slot) {
      if (this.deviceParamMappers[slot] != null) {
         base.host.println("Error. Attempting to add device to slot " + slot + ": slot already assigned!");
         return;
      } else {
         base.host.println("Assinging " + name + " to slot " + slot);
         int cc_base = -1;
         switch (slot) {
            case 0: {
               cc_base = base.CONTROLS_1_BASE;
            }
               ;
               break;
            case 1: {
               cc_base = base.CONTROLS_2_BASE;
            }
               ;
               break;
            case 2: {
               cc_base = base.CONTROLS_3_BASE;
            }
               ;
               break;
            default: {
               base.host.println("Error. Invalid slot assigment for device: " + name);
            }
         }
         ;
         if (cc_base > 0) {
            this.deviceParamMappers[slot] = new DeviceControlMapper(base, device, name, this, cc_base);
         } else {
            return;
         }
      }
   }

   public void addModDeviceMapper(ExtensionBase base, String name, Device device, int slot) {
      if (this.deviceModMappers[slot] != null) {
         base.host.println("Error. Attempting to add " + name + " to slot " + slot + ": slot already assigned!");
         return;
      } else {
         base.host.println("Assinging " + name + " to slot " + slot);
         int cc_base = -1;
         switch (slot) {
            case 0: {
               cc_base = base.MOD_1_BASE;
            }
               break;
            case 1: {
               cc_base = base.MOD_2_BASE;
            }
               break;
            case 2: {
               cc_base = base.MOD_3_BASE;
            }
               break;
            default: {
               base.host.println("Error. Invalid slot assigment for device: " + name);
            }
         }
         ;

         if (cc_base > 0) {
            this.deviceModMappers[slot] = new DeviceControlMapper(base, device, name, this, cc_base);
         } else {
            return;
         }
      }
   }

   public void addRoutingDeviceMapper(ExtensionBase base, Device device) {
      if (this.deviceRoutingMappers[0] != null) {
         base.host.println("Error. Routing mapping already assigned for " + this.name);
         return;
      } else {
         base.host.println("Assinging routing mapping for " + this.name);
         this.deviceRoutingMappers[0] = new DeviceControlMapper(base, device, this.name + " routing", this,
               base.ROUTING_BASE);
      }
      ;
   }

   public void createFaderMapping(ExtensionBase base) {
      fader = base.extensionHardwareSurface.createHardwareSlider(name.toUpperCase() + "_FADER");
      fader.setAdjustValueMatcher(base.scPortIn.createAbsoluteCCValueMatcher(midiChannel, base.TRACK_FADER_CC));
      fader.setBinding(track.volume());
   }

   public void createBusFaderMappings(ExtensionBase base) {
      busFaders = new HardwareSlider[busses.length];
      for (int i = 0; i < busses.length; i++) {
         // final int thisIndex = i;
         busFaders[i] = base.extensionHardwareSurface.createHardwareSlider("SLIDER_" + name.toUpperCase() + "_" + i);
         busFaders[i].setAdjustValueMatcher(
               base.oscPortIn.createAbsoluteCCValueMatcher(midiChannel, base.BUS_FADERS_BASE + i));
         busFaders[i].setBinding(base.bus_fader_bank.getItemAt(busses[i]).volume()); // map volume (old - retain for
                                                                                     // visual)
      }
   }

   public void createBusEnvelopeObservers(ExtensionBase base) {
      busGainKnobs = new AbsoluteHardwareKnob[busses.length]; // create busGainKnobs
      for (int i = 0; i < busses.length; i++) {
         final int thisIndex = i;

         ToolDeviceHandler toolDeviceHandler = new ToolDeviceHandler(base,
               base.bus_fader_bank.getItemAt(this.busses[thisIndex]).createDeviceBank(3));
         Device matchedDevice = toolDeviceHandler.getToolDevice(0);
         base.host.println("Device matched successfully!");
         this.envFollowerOscObservers[thisIndex] = new EnvFollowerOscObserver(matchedDevice, base, this.name,
               thisIndex);

         busGainKnobs[i] = base.extensionHardwareSurface
               .createAbsoluteHardwareKnob("KNOB_" + name.toUpperCase() + "_" + i);
         busGainKnobs[i].setAdjustValueMatcher(
               base.oscPortIn.createAbsoluteCCValueMatcher(midiChannel, base.BUS_FADERS_BASE + i));
         // assign to control 3 in the envelope follower remote controls page -
         // tool/volume
         this.envFollowerOscObservers[thisIndex].remoteControlsPage.getParameter(2).addBinding(busGainKnobs[i]);

         base.host.println(String.format("Created envelope observer for %s on bus channel %d", name, thisIndex));
      }
   }

   public void setupSends(ExtensionBase base, boolean mapBussesSends, boolean mapFxSends) {

      sends = track.sendBank();

      // map bus sends
      if (mapBussesSends) {

         busKnobs = new AbsoluteHardwareKnob[base.TOTAL_BUS_TRACKS];
         for (int k = 0; k < base.TOTAL_BUS_TRACKS; k++) {

            busKnobs[k] = base.extensionHardwareSurface
                  .createAbsoluteHardwareKnob("ABS_KNOB_" + name.toUpperCase() + "_BUS_" + k);
            busKnobs[k].setAdjustValueMatcher(
                  base.oscPortIn.createAbsoluteCCValueMatcher(midiChannel, base.BUS_SENDS_BASE + k));
            busKnobs[k].setBinding(sends.getItemAt(k + base.BUS_SENDS_START).value());

            if (sends.getSizeOfBank() < k + base.BUS_SENDS_START) {
               break;
            }
            // bus_knobs[k]
         }
      }

      // map fx sends
      if (mapFxSends) {
         fxKnobs = new AbsoluteHardwareKnob[base.TOTAL_FX_TRACKS];
         for (int k = 0; k < base.TOTAL_FX_TRACKS; k++) {

            fxKnobs[k] = base.extensionHardwareSurface
                  .createAbsoluteHardwareKnob("ABS_KNOB_" + name.toUpperCase() + "_FX_" + k);
            fxKnobs[k].setAdjustValueMatcher(
                  base.oscPortIn.createAbsoluteCCValueMatcher(midiChannel, base.FX_SENDS_BASE + k));
            fxKnobs[k].setBinding(sends.getItemAt(k + base.FX_SENDS_START).value());
            if (sends.getSizeOfBank() < k + base.FX_SENDS_START) {
               break;
            }
         }
      }

   }
}
