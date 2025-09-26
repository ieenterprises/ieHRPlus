
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileIcon as FileIconLucide, X } from 'lucide-react';
import { Download, ExternalLink } from 'lucide-react';
import { FileIcon } from '@/components/file-icon';

interface Attachment {
    name: string;
    url: string;
    contentType?: string;
}

const PreviewContent = ({ fileUrl, fileType }: { fileUrl: string, fileType: string }) => {
    const isOfficeDocOrPdf = fileType.includes('officedocument') ||
                           fileType.includes('msword') ||
                           fileType.includes('mspowerpoint') ||
                           fileType.includes('msexcel') ||
                           fileType === 'application/pdf';

    if (fileType.startsWith('image/')) {
        return <img src={fileUrl} alt="File preview" className="max-w-full max-h-[80vh] mx-auto" />;
    }
    if (fileType.startsWith('video/')) {
        return <video controls src={fileUrl} className="w-full max-h-[80vh]" />;
    }
    if (fileType.startsWith('audio/')) {
        return <audio controls src={fileUrl} className="w-full" />;
    }
    if (isOfficeDocOrPdf) {
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return <iframe src={googleDocsUrl} className="w-full h-full border-0" title="Document Preview" />;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileIconLucide className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-4">Preview not available</p>
            <p className="text-muted-foreground mb-6">This file type cannot be previewed directly in the browser.</p>
            <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                </a>
            </Button>
        </div>
    );
};


export function AttachmentPreviewer({ attachments, onRemove }: { attachments: Attachment[], onRemove?: (attachment: Attachment) => void }) {
    const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

    const handleDownload = (url: string, name: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    const getContentTypeFromName = (name: string): string => {
        const extension = name.split('.').pop()?.toLowerCase() || '';
        const types: Record<string, string> = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
            'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav',
            'pdf': 'application/pdf',
            'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        return types[extension] || 'application/octet-stream';
    };


    return (
        <>
            <div className="space-y-2 rounded-md border p-2">
                {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="flex items-center gap-2 text-sm text-primary hover:underline text-left flex-1 truncate"
                        >
                            <FileIcon item={{ type: 'file', name: file.name, metadata: { size: 0, updated: '', timeCreated: '' } }} className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                        </button>
                        {onRemove && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(file)}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
                    {previewFile && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="truncate">{previewFile.name}</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4 flex-1 overflow-auto bg-secondary/30 rounded-md">
                                <PreviewContent 
                                    fileUrl={previewFile.url} 
                                    fileType={previewFile.contentType || getContentTypeFromName(previewFile.name)} 
                                />
                            </div>
                            <DialogFooter className="mt-4 flex-shrink-0">
                                <Button onClick={() => handleDownload(previewFile.url, previewFile.name)}>
                                    <Download className="mr-2 h-4 w-4" />Download
                                </Button>
                                <Button variant="outline" onClick={() => setPreviewFile(null)}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
