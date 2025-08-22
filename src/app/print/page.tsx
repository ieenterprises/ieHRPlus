
"use client";

import { useEffect, useState } from 'react';
import { PrintableReceipt } from '@/components/printable-receipt';
import { PrintableA4Receipt } from '@/components/printable-a4-receipt';
import { SettingsProvider, useSettings } from '@/hooks/use-settings';

function PrintContent() {
    const [data, setData] = useState<any | null>(null);

    useEffect(() => {
        // This effect runs only on the client side
        const savedData = localStorage.getItem('printableData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            setData(parsedData);
            
            // Trigger print dialog after a short delay to ensure content is rendered
            setTimeout(() => {
                window.print();
            }, 500);

            // Add an event listener for after printing
            const handleAfterPrint = () => {
                // Clear the data from localStorage after printing
                localStorage.removeItem('printableData');
                // Close the window
                window.close();
            };

            window.addEventListener('afterprint', handleAfterPrint);

            // Clean up the event listener when the component unmounts
            return () => {
                window.removeEventListener('afterprint', handleAfterPrint);
            };
        } else {
             // If no data, close the window
             window.close();
        }
    }, []);

    if (!data) {
        return <div>Loading for print...</div>;
    }

    return (
        <div>
            {data.printFormat === 'thermal' ? (
                <PrintableReceipt data={data} type={data.type} />
            ) : (
                <PrintableA4Receipt data={data} type={data.type} />
            )}
        </div>
    );
}


export default function PrintPage() {
    // We wrap the PrintContent in SettingsProvider so the receipt components 
    // can access context like currency, store info, etc. from localStorage.
    return (
        <SettingsProvider>
            <PrintContent />
        </SettingsProvider>
    );
}
