
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { PrintableReceipt } from '@/components/printable-receipt';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PrintPage() {
    const router = useRouter();
    const { printableData, setPrintableData } = useSettings();

    useEffect(() => {
        // If there's no data, redirect back to dashboard.
        // This prevents users from accessing this page directly.
        if (!printableData) {
            router.replace('/dashboard');
        }
    }, [printableData, router]);
    
    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        // Clear the printable data when going back
        setPrintableData(null);
        router.back();
    }

    if (!printableData) {
        // Render nothing or a loading state while redirecting
        return null; 
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body {
                        background-color: #fff;
                    }
                    .print-area {
                       box-shadow: none !important;
                       margin: 0;
                       padding: 0;
                    }
                }
            `}</style>
            
            <header className="bg-white shadow-sm p-4 flex justify-between items-center no-print">
                <h1 className="text-xl font-semibold">Print Preview</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                </div>
            </header>

            <main className="flex justify-center p-4 sm:p-8">
                 <Card className="print-area shadow-lg">
                    <CardContent className="p-0">
                        <PrintableReceipt data={printableData} type={printableData.type} />
                    </CardContent>
                 </Card>
            </main>
        </div>
    );
}
