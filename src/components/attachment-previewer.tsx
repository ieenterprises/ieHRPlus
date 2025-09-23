
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileIcon } from '@/components/file-icon';
import { Download, ExternalLink } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import Link from 'next/link';

interface Attachment {
    name: string;
    url: string;
    // The contentType would be ideal here, but it's not stored in the request/query models.
    // We will have to make assumptions or fetch it, but for now, we'll work with what we have.
}

const PreviewContent = ({ fileUrl, fileName }: { fileUrl: string, fileName: string }) => {
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
    const isVideo = ['mp4', 'webm', 'ogg'].includes(fileType);
    const isAudio = ['mp3', 'wav'].includes(fileType);
    const isPdf = fileType === 'pdf';
    const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileType);

    if (isImage) {
        return <img src={fileUrl} alt="File preview" className="max-w-full max-h-[80vh] mx-auto" />;
    }
    if (isVideo) {
        return <video controls src={fileUrl} className="w-full max-h-[80vh]" />;
    }
    if (isAudio) {
        return <audio controls src={fileUrl} className="w-full" />;
    }
     if (isPdf) {
        return <iframe src={fileUrl} className="w-full h-full border-0" title="PDF Preview" />;
    }
    if (isOfficeDoc) {
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return <iframe src={googleDocsUrl} className="w-full h-full border-0" title="Document Preview" />;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileIcon item={{ type: 'file', name: fileName, metadata: { size: 0, updated: '', timeCreated: '' } }} className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-4">Preview not available</p>
            <p className="text-muted-foreground mb-6">This file type cannot be previewed directly.</p>
            <Button asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                </a>
            </Button>
        </div>
    );
};

export function AttachmentPreviewer({ attachments }: { attachments: Attachment[] }) {
    const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

    const handleDownload = (url: string, name: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <>
            <div className="space-y-2 rounded-md border p-2">
                {attachments.map((file, index) => (
                    <button
                        key={index}
                        onClick={() => setPreviewFile(file)}
                        className="w-full flex items-center gap-2 text-sm text-primary hover:underline text-left"
                    >
                        <FileIcon item={{ type: 'file', name: file.name, metadata: { size: 0, updated: '', timeCreated: '' } }} className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                    </button>
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
                                <PreviewContent fileUrl={previewFile.url} fileName={previewFile.name} />
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
