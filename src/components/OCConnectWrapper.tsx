import { OCConnect } from '@opencampus/ocid-connect-js';
import React from 'react';

interface OCConnectWrapperProps {
    children: React.ReactNode;
    sandboxMode?: boolean; // Optional boolean
}

export default function OCConnectWrapper({ children, sandboxMode = true }: OCConnectWrapperProps) {
    const opts = {
        // Client ID is not required in sandbox mode
        clientId: '<Does_Not_Matter_For_Sandbox_mode>',
        // Make sure this matches your router configuration
        redirectUri: window.location.origin + '/redirect',
        // Return to root after logout
        postLogoutRedirectUri: window.location.origin,
        // Partner referral code if applicable
        referralCode: 'PARTNER6',
        // Use localStorage by default
        storageType: 'localStorage',
        // Additional options that might help with stability
        autoSignIn: false,
        forceRefresh: false
    };
    
    return (
        <OCConnect opts={opts} sandboxMode={sandboxMode}>
            {children}
        </OCConnect>
    );
}