
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/hooks/use-settings';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { PrintableReceipt } from '@/components/printable-receipt';
import { PrintableA4Receipt } from '@/components/printable-a4-receipt';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Bluetooth } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from './ui/scroll-area';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const storage = getStorage(app);

// Function to format receipt data as plain text for thermal printers
const formatTextForBluetoothPrinter = (data: any, type: 'receipt' | 'ticket', currency: string, store: any) => {
    let text = '';
    const isSale = type === 'receipt';
    
    const center = (str: string) => str.padStart((48 - str.length) / 2 + str.length, ' ').padEnd(48, ' ');
    const line = '-'.repeat(48) + '\n';
    const twoCols = (left: string, right: string) => left.padEnd(48 - right.length, ' ') + right + '\n';
    
    text += center(store?.name || 'ieOrderFlow POS') + '\n';
    text += center(store?.address || '') + '\n';
    text += center(new Date(data.created_at).toLocaleString()) + '\n\n';
    
    text += center(isSale ? `RECEIPT #${data.order_number}` : `TICKET #${data.order_number}`) + '\n';
    text += twoCols('Cashier:', data.users?.name || 'N/A') + '\n';
    if(data.customers?.name) text += twoCols('Customer:', data.customers.name) + '\n';
    text += line;
    
    text += 'ITEM'.padEnd(24) + 'QTY'.padStart(8) + 'TOTAL'.padStart(16) + '\n';
    text += line;

    data.items.forEach((item: any) => {
        const total = (item.quantity * item.price).toFixed(2);
        text += item.name.substring(0, 24).padEnd(24);
        text += item.quantity.toString().padStart(8);
        text += (currency + total).padStart(16);
        text += '\n';
    });

    text += line;
    
    const subtotal = data.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const tax = data.total - subtotal;
    
    text += twoCols('Subtotal:', currency + subtotal.toFixed(2));
    text += twoCols('Tax:', currency + tax.toFixed(2));
    text += twoCols(isSale ? 'TOTAL:' : 'AMOUNT DUE:', currency + data.total.toFixed(2));
    
    if (isSale) {
        text += line;
        (data.payment_methods as string[]).forEach(method => {
            text += twoCols(`${method.toUpperCase()}:`, data.payment_methods.length === 1 ? currency + data.total.toFixed(2) : '');
        });
    }

    text += '\n' + center('Thank you!') + '\n\n\n';
    
    return text;
};


export function PrintPreviewDialog() {
    const { printableData, setPrintableData, isPrintModalOpen, setIsPrintModalOpen, loggedInUser, currency, stores } = useSettings();
    const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
    
    const printRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const isOnline = useOnlineStatus();
    const { toast } = useToast();


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

            if (isOnline && loggedInUser?.businessId) {
                // Online: Upload to Firebase Storage and redirect
                const fileName = `receipt-${printableData.order_number}-${Date.now()}.pdf`;
                const filePath = `${loggedInUser.businessId}/receipts/${fileName}`;
                const fileRef = storageRef(storage, filePath);
                
                await uploadBytes(fileRef, pdfBlob);
                const downloadURL = await getDownloadURL(fileRef);
                
                sessionStorage.setItem('pdfUrl', downloadURL);
                router.push('/pdf-viewer');
            } else {
                // Offline: Create a blob URL and redirect to the viewer page
                const pdfUrl = URL.createObjectURL(pdfBlob);
                sessionStorage.setItem('pdfUrl', pdfUrl);
                router.push('/pdf-viewer');
            }

            handleClose();

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleBluetoothPrint = async () => {
        if (!("bluetooth" in navigator)) {
            toast({
                title: "Web Bluetooth Not Supported",
                description: "Your browser does not support the Web Bluetooth API. Please use a browser like Chrome.",
                variant: "destructive"
            });
            return;
        }

        setIsBluetoothPrinting(true);
        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
            });

            if (!device.gatt) {
                throw new Error("Could not connect to the device's GATT server.");
            }

            const server = await device.gatt.connect();
            toast({ title: "Connected", description: `Connected to ${device.name}.`});
            
            // Get the Serial Port Profile service after connecting
            const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
            
            if (!service) {
                throw new Error("Serial Port Profile service not found on the device.");
            }

            const characteristics = await service.getCharacteristics();
            const characteristic = characteristics[0];

            if (!characteristic) {
                throw new Error("No characteristic found for the service.");
            }
            
            const store = stores.find(s => s.id === (printableData.pos_devices?.store_id || stores[0]?.id));
            const receiptText = formatTextForBluetoothPrinter(printableData, printableData.type, currency, store);
            
            const encoder = new TextEncoder();
            const data = encoder.encode(receiptText);
            
            // Writing data in chunks to avoid size limits
            const chunkSize = 100;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                await characteristic.writeValue(chunk);
            }
            
            toast({ title: "Print Successful", description: "Receipt sent to printer." });
            
            if (device.gatt.connected) {
              device.gatt.disconnect();
            }
            handleClose();

        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                // This is the specific error when a user cancels the device picker.
                console.log("Bluetooth device selection cancelled by user.");
            } else {
                console.error("Bluetooth printing error:", error);
                toast({
                    title: "Bluetooth Print Error",
                    description: error.message || "An unknown error occurred. Ensure the device is a compatible serial printer.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsBluetoothPrinting(false);
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
                        <Button onClick={handleBluetoothPrint} disabled={isBluetoothPrinting} variant="secondary">
                            {isBluetoothPrinting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Bluetooth className="mr-2 h-4 w-4" />
                            )}
                            Connect & Print
                        </Button>
                        <Button onClick={handleGeneratePdf} disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-2 h-4 w-4" />
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
