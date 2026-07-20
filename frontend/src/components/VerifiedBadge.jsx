import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function VerifiedBadge({ status }) {
    if (status !== 'verified') return null;
    return (
        <span className="inline-flex items-center text-blue-400 ml-1" title="AI Verified">
            <CheckCircle size={16} className="fill-blue-500/20" />
        </span>
    );
}
