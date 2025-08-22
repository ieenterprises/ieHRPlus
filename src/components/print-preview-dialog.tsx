
"use client";

import { useState } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { PrintableReceipt } from '@/components/printable-receipt';
import { PrintableA4Receipt } from '@/components/printable-a4-receipt';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from './ui/scroll-area';

export function PrintPreviewDialog() {
    const { printableData, setPrintableData, isPrintModalOpen, setIsPrintModalOpen } = useSettings();
    const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

    if (!isPrintModalOpen || !printableData) {
        return null;
    }
    
    const handlePrint = () => {
        window.print();
    };

    const handleClose = () => {
        setIsPrintModalOpen(false);
        setPrintableData(null); // Clear data when closing
    }

    return (
        <>
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body > *:not(.print-this) {
                        display: none !important;
                    }
                    .print-this {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        overflow: visible;
                    }
                }
                @page {
                  size: ${printFormat === 'a4' ? 'A4' : 'auto'};
                  margin: ${printFormat === 'a4' ? '20mm' : '0'};
                }
            `}</style>
            
            <Dialog open={isPrintModalOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col no-print">
                    <DialogHeader>
                        <DialogTitle>Print Preview</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                       <ScrollArea className="h-full bg-gray-100 rounded-md p-4">
                            <div className="flex justify-center">
                                 {printFormat === 'thermal' ? (
                                    <PrintableReceipt data={printableData} type={printableData.type} />
                                ) : (
                                    <PrintableA4Receipt data={printableData} type={printableData.type} />
                                )}
                            </div>
                       </ScrollArea>
                    </div>
                    <DialogFooter className="flex-row justify-between items-center">
                        <Tabs value={printFormat} onValueChange={(value) => setPrintFormat(value as 'thermal' | 'a4')}>
                            <TabsList>
                                <TabsTrigger value="thermal">Thermal</TabsTrigger>
                                <TabsTrigger value="a4">A4</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-2">
                           <Button variant="outline" onClick={handleClose}>
                                Close
                            </Button>
                            <Button onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="hidden print-this">
                {printableData && (printFormat === 'thermal' ? (
                    <PrintableReceipt data={printableData} type={printableData.type} />
                ) : (
                    <PrintableA4Receipt data={printableData} type={printableData.type} />
                ))}
            </div>
        </>
    );
}
