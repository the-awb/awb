package com.armedwithbow;

import com.bitwig.extension.controller.api.HardwareButton;
import com.bitwig.extension.controller.api.SceneBank;
import com.bitwig.extension.controller.api.TrackBank;

public class TrackSceneMapper {
    private int SCENE_SLOTS;

    private HardwareButton[] sceneButtons;
    private TrackBank trackBank;
    private SceneBank sceneBank;

    TrackSceneMapper(ExtensionBase base, DynamicTrackModule mod, int bankSize) {
        this.SCENE_SLOTS = bankSize;

        sceneButtons = new HardwareButton[SCENE_SLOTS];
        trackBank = mod.track.createTrackBank(1, 0, SCENE_SLOTS, false);
        sceneBank = trackBank.sceneBank();

        for (int i = 0; i < SCENE_SLOTS; i++) {
            sceneButtons[i] = base.extensionHardwareSurface.createHardwareButton("BUTTON_SCN" + i);
            sceneButtons[i].pressedAction()
                    .setActionMatcher(base.scPortIn.createNoteOnActionMatcher(mod.midiChannel, i));

            sceneButtons[i].pressedAction().addBinding(sceneBank.getItemAt(i).launchAction());

        }
        ;

    }
}