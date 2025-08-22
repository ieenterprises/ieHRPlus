
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
        // Save the data to localStorage so the new tab can access it
        localStorage.setItem('printableData', JSON.stringify({ ...printableData, printFormat }));
        // Open the new print page in a new tab
        window.open('/print', '_blank');
    };

    const handleClose = () => {
        setIsPrintModalOpen(false);
        setPrintableData(null); // Clear data when closing
    }

    return (
        <Dialog open={isPrintModalOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
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
    );
}
