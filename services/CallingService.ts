// This is a Mock Calling Service for Web/Unsupported platforms
// Native calling features are available in CallingService.native.tsx

export const ZEGO_APP_ID = 540771903;
export const ZEGO_APP_SIGN = 'e729a912d74a28b05557787347588f85dac2351866487d80c6d4206421af8641';

export const onUserLogin = async (userId: string, userName: string) => {
    console.log("[CallingService] Mock login (Web not supported)");
};

export const onUserLogout = async () => {
    console.log("[CallingService] Mock logout");
};

export const startCall = async (receiverId: string, receiverName: string, isVideo: boolean) => {
    alert("Calling feature is only available on Mobile app.");
};

export const logCallToBackend = async (receiverId: string, type: 'audio' | 'video', status: string, duration: number = 0) => {
    // No-op for web
};
