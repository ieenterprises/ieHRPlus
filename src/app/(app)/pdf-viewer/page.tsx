
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PdfViewerPage() {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const url = sessionStorage.getItem('pdfUrl');
        if (url) {
            setPdfUrl(url);
            // Clean up immediately after reading to prevent re-use
            sessionStorage.removeItem('pdfUrl');
        } else if (!pdfUrl) {
            // If there's no URL in storage and we haven't set one in state yet,
            // it means the page was likely accessed directly.
            // Redirect to a safe place.
            router.push('/kitchen');
        }
        setIsLoading(false);
    }, [router, pdfUrl]); // Depend on pdfUrl to prevent re-running the check unnecessarily

    const handleCopy = () => {
        if (pdfUrl) {
            navigator.clipboard.writeText(pdfUrl);
            toast({
                title: "Link Copied!",
                description: "The PDF link has been copied to your clipboard.",
            });
        }
    };

    if (isLoading || !pdfUrl) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Loading PDF link...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary/50 p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">PDF Generated Successfully!</CardTitle>
                    <CardDescription>
                        Your receipt is ready. You can now open it, copy the link, or share it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 text-left">
                        <Label htmlFor="pdf-link">Shareable Link</Label>
                        <div className="flex items-center gap-2">
                            <Input id="pdf-link" value={pdfUrl} readOnly className="flex-1" />
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Button asChild size="lg" className="w-full">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-5 w-5" />
                            Open PDF in New Tab
                        </a>
                    </Button>
                </CardContent>
                <CardFooter>
                    <Button variant="ghost" className="w-full" asChild>
                        <Link href="/kitchen">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Orders
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
