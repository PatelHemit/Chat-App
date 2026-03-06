import { registerGlobals } from '@livekit/react-native';
// @ts-ignore
import { Event, EventTarget } from 'event-target-shim';

export const registerLiveKitGlobals = () => {
    // Standard react-native-webrtc and livekit registration
    registerGlobals();

    // Explicitly set Event and EventTarget on global if missing
    if (typeof global.Event === 'undefined') {
        // @ts-ignore
        global.Event = Event;
    }
    if (typeof global.EventTarget === 'undefined') {
        // @ts-ignore
        global.EventTarget = EventTarget;
    }
};
