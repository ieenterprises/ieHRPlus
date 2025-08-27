
"use client";

import { useState, useRef } from 'react';
import { useSettings } from '@/hooks/use-settings';
import { PrintableReceipt } from '@/components/printable-receipt';
import { PrintableA4Receipt } from '@/components/printable-a4-receipt';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, FileUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from './ui/scroll-area';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export function PrintPreviewDialog() {
    const { printableData, setPrintableData, isPrintModalOpen, setIsPrintModalOpen } = useSettings();
    const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const printRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const storage = getStorage(app);

    if (!isPrintModalOpen || !printableData) {
        return null;
    }
    
    const handleGeneratePdf = async () => {
        if (!printRef.current) return;
        
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(printRef.current, { scale: 3 });
            const imgData = canvas.toDataURL('image/png');
            
            let pdf;
            if (printFormat === 'a4') {
                pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = 210;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            } else {
                const pdfWidth = 80;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [pdfWidth, pdfHeight]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
            
            const pdfBlob = pdf.output('blob');
            const fileName = `receipt-${printableData.order_number}-${Date.now()}.pdf`;
            const fileRef = storageRef(storage, `receipts/${fileName}`);

            await uploadBytes(fileRef, pdfBlob);
            const downloadURL = await getDownloadURL(fileRef);

            // Store URL in session storage to be picked up by the viewer page
            sessionStorage.setItem('pdfUrl', downloadURL);

            handleClose();
            router.push('/pdf-viewer');

        } catch (error) {
            console.error("Error generating or uploading PDF:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClose = () => {
        setIsPrintModalOpen(false);
        setPrintableData(null);
    }

    const PrintableWrapper = ({ children }: { children: React.ReactNode }) => (
        <div ref={printRef}>{children}</div>
    );

    return (
        <Dialog open={isPrintModalOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Receipt Preview</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                   <ScrollArea className="h-full bg-gray-100 rounded-md p-4">
                        <div className="flex justify-center">
                             <PrintableWrapper>
                                {printFormat === 'thermal' ? (
                                    <PrintableReceipt data={printableData} type={printableData.type} />
                                ) : (
                                    <PrintableA4Receipt data={printableData} type={printableData.type} />
                                )}
                             </PrintableWrapper>
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
                        <Button onClick={handleGeneratePdf} disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Generate PDF
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
