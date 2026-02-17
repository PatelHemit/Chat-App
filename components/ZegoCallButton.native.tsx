import { ZegoSendCallInvitationButton } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import React from 'react';

interface Props {
    inviteeId: string;
    inviteeName: string;
    isVideo: boolean;
    theme: any;
}

export const ZegoCallButton: React.FC<Props> = ({ inviteeId, inviteeName, isVideo }) => {
    return (
        <ZegoSendCallInvitationButton
            invitees={[{ userID: inviteeId, userName: inviteeName }]}
            isVideoCall={isVideo}
            resourceID={"zego_uikit_call"} // For offline background notifications
        />
    );
};
