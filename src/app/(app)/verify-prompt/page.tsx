
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

export default function VerifyPromptPage() {
    const router = useRouter();

    const handleProceed = () => {
        router.push('/video-verification');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center">
                <Button size="lg" onClick={handleProceed}>
                    <Video className="mr-2 h-5 w-5" />
                    Click for Video Verification
                </Button>
            </div>
        </div>
    );
}
