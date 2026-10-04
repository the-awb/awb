package com.armedwithbow;
import java.util.UUID;

import com.bitwig.extension.api.PlatformType;
import com.bitwig.extension.controller.AutoDetectionMidiPortNamesList;
import com.bitwig.extension.controller.ControllerExtensionDefinition;
import com.bitwig.extension.controller.api.ControllerHost;



public class OSCControllerforAWBExtensionDefinition extends ControllerExtensionDefinition
{
   private static final UUID DRIVER_ID = UUID.fromString("76988a50-19a4-4ded-baf3-6891f1e64e80");
   
   public OSCControllerforAWBExtensionDefinition()
   {
   }

   @Override
   public String getName()
   {
      return "OSC Controller for AWB";
   }
   
   @Override
   public String getAuthor()
   {
      return "A_W_B";
   }

   @Override
   public String getVersion()
   {
      return "0.1";
   }

   @Override
   public UUID getId()
   {
      return DRIVER_ID;
   }
   
   @Override
   public String getHardwareVendor()
   {
      return "Armed With Bow";
   }
   
   @Override
   public String getHardwareModel()
   {
      return "OSCAWBGlue01";
   }

   @Override
   public int getRequiredAPIVersion()
   {
      return 16;
   }

   @Override
   public int getNumMidiInPorts()
   {
      return 2;
   }

   @Override
   public int getNumMidiOutPorts()
   {
      return 0;
   }

   @Override
   public void listAutoDetectionMidiPortNames(final AutoDetectionMidiPortNamesList list, final PlatformType platformType)
   {
            // Not used
   }

   @Override
   public OSCControllerforAWBExtension createInstance(final ControllerHost host)
   {
      return new OSCControllerforAWBExtension(this, host);
   }
}
