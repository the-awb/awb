package com.armedwithbow;

import com.bitwig.extension.controller.api.TrackBank;
import java.util.HashMap;
import java.util.Map;

/*
 * Contains a groupTrackBank which serves as the reference for a bundle of Tracks
 * AWB is set up to use 2 - 1 for sound sources (audio inputs), one for FX chains
 */
public class InterfaceGroup {
   public final String name;
   public final String type;
   public final int groupSize;
   public final int startIndex;
   public final Boolean useFlatTrack;
   public TrackBank groupTrackBank;
   public Map<String, DynamicTrackModule> modulesMap;
   private ExtensionBase base;

   InterfaceGroup(ExtensionBase base, String name, String type, int groupSize, int startIndex, int clipBankSize,
         Boolean useFlatTrack) {
      this.name = name;
      this.groupSize = groupSize;
      this.startIndex = startIndex;
      this.type = type;
      this.modulesMap = new HashMap<String, DynamicTrackModule>();
      this.useFlatTrack = useFlatTrack;
      this.base = base;

      switch (type) {
         case "track":
            groupTrackBank = base.host.createMainTrackBank(this.groupSize, base.TOTAL_BUS_TRACKS + base.TOTAL_FX_TRACKS,
                  clipBankSize);
            break;
         case "mixed":
            groupTrackBank = base.host.createTrackBank(this.groupSize, base.TOTAL_BUS_TRACKS + base.TOTAL_FX_TRACKS,
                  clipBankSize, useFlatTrack);
            break;
         case "fx":
            groupTrackBank = base.host.createEffectTrackBank(base.TOTAL_BUS_TRACKS + base.TOTAL_FX_TRACKS,
                  clipBankSize);
            break;
      }

   }

   public void addModule(String key, int trackOffset, int midiChannel, int[] bussesToMap, boolean mapBusSends,
         boolean mapFXSends, boolean mapFader, boolean mapEnvelopeFollower) {
      modulesMap.put(key, new DynamicTrackModule(base, this.startIndex + trackOffset, key, midiChannel, bussesToMap,
            mapBusSends, mapFXSends, mapFader, groupTrackBank.getItemAt(startIndex + trackOffset),
            mapEnvelopeFollower));

   }

   // setup sliders for bus tracks associated with the group
   public void createBusFaderMappings() {
      for (DynamicTrackModule mod : modulesMap.values()) {

         mod.createBusFaderMappings(base);
      }
   }

}