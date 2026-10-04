package com.armedwithbow;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.MidiIn;
import com.bitwig.extension.controller.api.MidiOut;
import com.bitwig.extension.controller.api.HardwareSurface;
import com.bitwig.extension.controller.api.TrackBank;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import com.bitwig.extension.api.opensoundcontrol.OscConnection;
import com.bitwig.extension.api.opensoundcontrol.OscModule;

public class ExtensionBase {
   public Map<String, Double> pendingOscMessages = new HashMap<>();
   public final ControllerHost host;
   public final HardwareSurface extensionHardwareSurface;
   public final MidiIn oscPortIn;
   public final MidiIn scPortIn;
   // public final MidiOut scPortOut;

   public final int TRACK_FADER_CC;
   public final int ROUTING_BASE;
   public final int CONTROLS_1_BASE;
   public final int CONTROLS_2_BASE;
   public final int CONTROLS_3_BASE;
   public final int MOD_1_BASE;
   public final int MOD_2_BASE;
   public final int MOD_3_BASE;
   public final int DIRECT_PARAM_BASE;
   public final int FX_SENDS_BASE;
   public final int BUS_SENDS_BASE;
   public final int BUS_FADERS_BASE;
   public final int TOTAL_BUS_TRACKS;
   public final int TOTAL_FX_TRACKS;
   public final int BUS_SENDS_START;
   public final int BUS_SENDS_END;
   public final int FX_SENDS_START;
   public final int SCENE_SLOTS;
   public OscConnection oscConnection;
   // public final MidiOut outPort;

   // Track Bank for the faders for channels used to send analysis audio streams
   public final TrackBank bus_fader_bank;

   ExtensionBase(ControllerHost host, int TOTAL_BUS_TRACKS, int TOTAL_FX_TRACKS, int BUS_SENDS_START,
         int FX_SENDS_START, int BUS_SENDS_END, int SCENE_SLOTS)

   {
      this.host = host;
      this.extensionHardwareSurface = host.createHardwareSurface();
      this.oscPortIn = host.getMidiInPort(0);
      this.scPortIn = host.getMidiInPort(1);
      // this.scPortOut = host.getMidiOutPort(2);
      OscModule oscModule = host.getOscModule();
      // createAddressSpace is for getting answers --
      // https://www.youtube.com/watch?v=1eoNBkXgOJk&ab_channel=J%C3%BCrgenMo%C3%9Fgraber
      // this.oscConnection = oscModule.connectToUdpServer("127.0.0.1", 9000,
      // oscModule.createAddressSpace());
      this.host.println("We are live");
      this.oscConnection = oscModule.connectToUdpServer("127.0.0.1", 9000, oscModule.createAddressSpace());
      this.host.println("OSC connection initialised");

      this.bus_fader_bank = host.createEffectTrackBank(BUS_SENDS_END, 0);

      TRACK_FADER_CC = 9;
      ROUTING_BASE = 0;
      CONTROLS_1_BASE = 10;
      CONTROLS_2_BASE = 20;
      CONTROLS_3_BASE = 30;
      MOD_1_BASE = 40;
      MOD_2_BASE = 50;
      MOD_3_BASE = 60;
      DIRECT_PARAM_BASE = 70;
      FX_SENDS_BASE = 80;
      BUS_SENDS_BASE = 100;
      BUS_FADERS_BASE = 120;

      this.TOTAL_BUS_TRACKS = TOTAL_BUS_TRACKS;
      this.TOTAL_FX_TRACKS = TOTAL_FX_TRACKS;
      this.BUS_SENDS_START = BUS_SENDS_START;
      this.FX_SENDS_START = FX_SENDS_START;
      this.BUS_SENDS_END = BUS_SENDS_END;
      this.SCENE_SLOTS = SCENE_SLOTS;

   }

   // uses OSC bundling on flush() rather than sending messages individually
   void sendOscMessage(String address, Object value) {
      // Just queue the message - it will be sent in the next flush cycle
      if (value instanceof Double) {
         // this.host.println(String.format("%s --> %f", address, value));
         pendingOscMessages.put(address, (Double) value);
         // this.host.println("Queued OSC message: " + address + " -> " + value +
         // " (Total: " + pendingOscMessages.size() + ")");
      } else if (value instanceof Integer) {
         pendingOscMessages.put(address, ((Integer) value).doubleValue());
      }
      // Could handle other types as needed
   }

   // to just send an OSC message - needed the try / catch exception loop

   // void sendOscMessage(String address, Object value) {
   // try {
   // this.oscConnection.startBundle();
   // this.oscConnection.sendMessage(address, value);
   // this.oscConnection.endBundle();
   // this.host.println(String.format("%s --> %f", address, value));
   // } catch (IOException e) {
   // this.host.println("ERROR: Failed to send OSC message: " + e.getMessage());

   // }
   // }
}
