// Type declarations for packages without official TypeScript support

declare module '@zegocloud/zego-uikit-prebuilt-call-rn' {
    export const ZegoSendCallInvitationButton: any;
    export default class ZegoUIKitPrebuiltCallService {
        static init(...args: any[]): void;
        static uninit(): void;
    }
}

declare module 'zego-zim-react-native' {
    const ZIM: any;
    export default ZIM;
}

declare module 'zego-zpns-react-native' {
    const ZPNs: any;
    export default ZPNs;
}

declare module 'socket.io-client' {
    export function io(url: string, options?: any): any;
}
