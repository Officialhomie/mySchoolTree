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
        // Update this to match your actual deployment URL and redirect path
        redirectUri: window.location.origin + '/redirect',
        // Partner referral code if applicable
        referralCode: 'PARTNER6',
        // Use localStorage by default
        storageType: 'localStorage',
    };
    
    return (
        <OCConnect opts={opts} sandboxMode={sandboxMode}>
            {children}
        </OCConnect>
    );
}