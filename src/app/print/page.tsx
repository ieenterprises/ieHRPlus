
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { PrintableReceipt } from '@/components/printable-receipt';
import { PrintableA4Receipt } from '@/components/printable-a4-receipt';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PrintPage() {
    const router = useRouter();
    const { printableData, setPrintableData } = useSettings();
    const [mounted, setMounted] = useState(false);
    const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !printableData) {
            router.replace('/dashboard');
        }
    }, [printableData, router, mounted]);
    
    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        setPrintableData(null);
        router.back();
    }

    if (!mounted || !printableData) {
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
                       width: 100% !important;
                    }
                }
                @page {
                  size: ${printFormat === 'a4' ? 'A4' : 'auto'};
                  margin: ${printFormat === 'a4' ? '20mm' : '0'};
                }
            `}</style>
            
            <header className="bg-white shadow-sm p-4 flex justify-between items-center no-print">
                <h1 className="text-xl font-semibold">Print Preview</h1>
                <div className="flex items-center gap-4">
                    <Tabs value={printFormat} onValueChange={(value) => setPrintFormat(value as 'thermal' | 'a4')}>
                      <TabsList>
                        <TabsTrigger value="thermal">Thermal</TabsTrigger>
                        <TabsTrigger value="a4">A4</TabsTrigger>
                      </TabsList>
                    </Tabs>
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
                </div>
            </header>

            <main className="flex justify-center p-4 sm:p-8">
                 <Card className="print-area shadow-lg">
                    <CardContent className="p-0">
                        {printFormat === 'thermal' ? (
                            <PrintableReceipt data={printableData} type={printableData.type} />
                        ) : (
                            <PrintableA4Receipt data={printableData} type={printableData.type} />
                        )}
                    </CardContent>
                 </Card>
            </main>
        </div>
    );
}
