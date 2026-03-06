class CallKeepService {
    async setup() { }
    displayIncomingCall(uuid: string, handle: string, localizedCallerName: string) { }
    answerCall(uuid: string) { }
    endCall(uuid: string) { }
    backToForeground() { }
    addEventListener(type: string, handler: (args: any) => void) { }
    removeEventListener(type: string, handler: (args: any) => void) { }
}

export default new CallKeepService();
