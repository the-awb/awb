package com.armedwithbow;

import org.json.simple.JSONObject;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.io.FileReader;
import java.io.IOException;
import java.io.FileNotFoundException;
import java.io.FileInputStream;
import java.io.InputStream;

import org.json.simple.JSONArray;
import org.json.simple.parser.ParseException;
import org.json.simple.parser.JSONParser;

// This is not used anywhere currently

public class JSONhandler {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        // JSON parser object to parse read file
        JSONParser jsonParser = new JSONParser();

        try (FileReader reader = new FileReader("/Users/willy/Documents/GitHub/osc-config/midiChannels.json")) {
            // Read JSON file
            Object obj = jsonParser.parse(reader);

            JSONArray moduleConfigArray = (JSONArray) obj;
            System.out.println(moduleConfigArray);

            // Iterate over employee array
            moduleConfigArray.forEach(mod -> parseModuleConfig((JSONObject) mod));

        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        }
    }

    private static void parseBusConfig(JSONObject bus) {
        String name = (String) bus.get("name");
        int offset = (int) bus.get("offset");
        int bitwigIndex = (int) bus.get("bitwigIndex");

    }

    private static void parseModuleConfig(JSONObject mod) {
        // final DynamicTrackModule vc_fx_mod = new DynamicTrackModule( 2, "vc fx", 1,
        // new int[]{}, false, true, false); //vc + ubermod
        // Get employee object within list
        String name = (String) mod.get("name");
        int midiChannel = (int) mod.get("midiChannel");
        String trackGroup = (String) mod.get("trackGroup");
        int trackGroupIndex = (int) mod.get("trackGroupIndex");
        boolean mapFXSends = (boolean) mod.get("fxSends");
        boolean mapBusSends = (boolean) mod.get("busSends");

        JSONArray busChannels = (JSONArray) mod.get("busChannels");

        busChannels.forEach(bus -> parseBusConfig((JSONObject) bus));

        // getHost().println(name)
    }
}