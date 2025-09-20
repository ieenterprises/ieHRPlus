
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MoreVertical, Folder, File as FileIconLucide, FolderPlus, UploadCloud, Home, ChevronRight, Download, Trash2, Edit, Copy, Move, ClipboardPaste, X, ExternalLink, Loader2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FileItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { listItems, createFolder, uploadFile, deleteItem, renameItem, getPublicUrl, moveItem, copyItem } from '@/lib/firebase-storage';
import { FileIcon } from '@/components/file-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/use-settings';

type ClipboardData = {
  item: FileItem;
  sourcePath: string;
  operation: 'copy' | 'move';
};

const PreviewContent = ({ fileUrl, fileType }: { fileUrl: string, fileType: string }) => {
    const isOfficeDoc = fileType.includes('officedocument') || fileType.includes('msword') || fileType.includes('mspowerpoint') || fileType.includes('msexcel');

    if (fileType.startsWith('image/')) {
        return <img src={fileUrl} alt="File preview" className="max-w-full max-h-[80vh] mx-auto" />;
    }
    if (fileType.startsWith('video/')) {
        return <video controls src={fileUrl} className="w-full max-h-[80vh]" />;
    }
    if (fileType.startsWith('audio/')) {
        return <audio controls src={fileUrl} className="w-full" />;
    }
     if (fileType === 'application/pdf') {
        return <iframe src={fileUrl} className="w-full h-full border-0" title="PDF Preview" />;
    }
    if (isOfficeDoc) {
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


export default function FileManagerPage() {
    const [path, setPath] = useState<string>('');
    const [items, setItems] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [renameData, setRenameData] = useState<{ item: FileItem; newName: string } | null>(null);
    const [createFolderName, setCreateFolderName] = useState('');
    const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState<{ create?: boolean; upload?: boolean; preview?: boolean; }>({});
    const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
    const [previewFile, setPreviewFile] = useState<{ item: FileItem; url: string } | null>(null);

    const { toast } = useToast();
    const { loggedInUser, loadingUser } = useSettings();
    const businessId = loggedInUser?.businessId;

    const fetchItems = useCallback(async () => {
        if (!businessId) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedItems = await listItems(businessId, path);
            setItems(fetchedItems);
        } catch (err: any) {
            setError(err.message);
            toast({ variant: 'destructive', title: 'Error fetching files', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [path, toast, businessId]);

    useEffect(() => {
        if (!loadingUser && businessId) {
            fetchItems();
        }
    }, [fetchItems, loadingUser, businessId]);

    const handleCreateFolder = async () => {
        if (!createFolderName || !businessId) return;
        try {
            await createFolder(businessId, `${path ? path + '/' : ''}${createFolderName}`);
            toast({ title: 'Folder created', description: `Successfully created "${createFolderName}".` });
            setCreateFolderName('');
            setDialogOpen({ ...dialogOpen, create: false });
            fetchItems();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error creating folder', description: err.message });
        }
    };

    const handleUploadFile = async () => {
        if (!uploadFileObj || !businessId) return;
        setIsUploading(true);
        setUploadProgress(0);
        try {
            await uploadFile(
                businessId,
                path,
                uploadFileObj,
                (progress) => setUploadProgress(progress)
            );
            toast({ title: 'File uploaded', description: `Successfully uploaded "${uploadFileObj.name}".` });
            setUploadFileObj(null);
            setDialogOpen({ ...dialogOpen, upload: false });
            fetchItems();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error uploading file', description: err.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (item: FileItem) => {
        if (!businessId) return;
        try {
            await deleteItem(businessId, item, path);
            toast({ title: 'Item deleted', description: `Successfully deleted "${item.name}".` });
            fetchItems();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error deleting item', description: err.message });
        }
    };

    const handleRename = async () => {
        if (!renameData || !businessId) return;
        const { item, newName } = renameData;
        if (!newName || newName === item.name) {
            setRenameData(null);
            return;
        }

        try {
            await renameItem(businessId, item, newName, path);
            toast({ title: 'Item renamed', description: `Successfully renamed "${item.name}" to "${newName}".` });
            setRenameData(null);
            fetchItems();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error renaming item', description: err.message });
        }
    };

    const handleItemClick = async (item: FileItem) => {
        if (item.type === 'folder') {
            setPath(`${path ? path + '/' : ''}${item.name}`);
        } else {
            await handlePreview(item);
        }
    };

    const handlePreview = async (item: FileItem) => {
        if (!businessId) return;
        try {
            const itemPath = `${path ? path + '/' : ''}${item.name}`;
            const url = await getPublicUrl(businessId, itemPath);
            setPreviewFile({ item, url });
            setDialogOpen({ ...dialogOpen, preview: true });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error showing preview', description: err.message });
        }
    };

    const handleDownload = async (item: FileItem) => {
        if (!businessId) return;
        try {
            const itemPath = `${path ? path + '/' : ''}${item.name}`;
            const url = await getPublicUrl(businessId, itemPath);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error downloading file', description: err.message });
        }
    };

    const handleSetClipboard = (item: FileItem, operation: 'copy' | 'move') => {
        setClipboard({ item, operation, sourcePath: path });
        toast({ title: `${operation === 'copy' ? 'Copied' : 'Selected'} to clipboard`, description: `"${item.name}" is ready to be pasted.` });
    };

    const handlePaste = async () => {
        if (!clipboard || !businessId) return;
        const { item, operation, sourcePath } = clipboard;

        const fromPath = `${sourcePath ? sourcePath + '/' : ''}${item.name}`;
        const toPath = `${path ? path + '/' : ''}${item.name}`;

        if (fromPath === toPath && operation === 'move') {
            toast({ variant: 'destructive', title: 'Cannot move item', description: 'Source and destination are the same.' });
            return;
        }

        try {
            if (operation === 'copy') {
                await copyItem(businessId, fromPath, toPath, item.type === 'folder');
                toast({ title: 'Item copied', description: `Successfully copied "${item.name}" to the current folder.` });
            } else if (operation === 'move') {
                await moveItem(businessId, fromPath, toPath, item.type === 'folder');
                toast({ title: 'Item moved', description: `Successfully moved "${item.name}" to the current folder.` });
            }
            setClipboard(null);
            fetchItems();
        } catch (err: any) {
            toast({ variant: 'destructive', title: `Error ${operation === 'copy' ? 'copying' : 'moving'} item`, description: err.message });
        }
    };

    const pathSegments = useMemo(() => {
        const segments = path.split('/').filter(Boolean);
        return segments.map((segment, index) => ({ name: segment, path: segments.slice(0, index + 1).join('/') }));
    }, [path]);

    const filteredItems = useMemo(() => {
        return items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm]);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [filteredItems]);

    const showLoading = isLoading || loadingUser;

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <Card className="w-full max-w-7xl mx-auto shadow-lg flex-1 flex flex-col">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">File Manager</CardTitle>
                        <CardDescription>Your organization's cloud storage powered by Firebase.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search in this folder..."
                                className="pl-9 w-full sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {clipboard && <Button onClick={handlePaste} disabled={showLoading}><ClipboardPaste className="mr-2 h-4 w-4" /> Paste</Button>}
                            <Button variant="outline" onClick={() => setDialogOpen({ ...dialogOpen, create: true })} disabled={showLoading}><FolderPlus className="mr-2 h-4 w-4" /> New Folder</Button>
                            <Button onClick={() => setDialogOpen({ ...dialogOpen, upload: true })} disabled={showLoading}><UploadCloud className="mr-2 h-4 w-4" /> Upload File</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap">
                        <button onClick={() => setPath('')} className="flex items-center gap-1 hover:text-primary" disabled={showLoading}><Home className="h-4 w-4" /></button>
                        {pathSegments.length > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                        {pathSegments.map((segment, index) => (
                            <div key={segment.path} className="flex items-center gap-2">
                                <button onClick={() => setPath(segment.path)} className="hover:text-primary" disabled={showLoading}>{segment.name}</button>
                                {index < pathSegments.length - 1 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">Name</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Last Modified</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {showLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : sortedItems.length > 0 ? (
                                    sortedItems.map((item) => (
                                        <TableRow key={item.name}>
                                            <TableCell className="font-medium flex items-center gap-2 cursor-pointer hover:text-primary" onClick={() => handleItemClick(item)}>
                                                <FileIcon item={item} />
                                                <span>{item.name}</span>
                                            </TableCell>
                                            <TableCell>{item.type === 'file' ? formatBytes(item.metadata.size) : '-'}</TableCell>
                                            <TableCell>{new Date(item.metadata.updated || item.metadata.timeCreated).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {item.type === 'file' && <DropdownMenuItem onSelect={() => handlePreview(item)}><ExternalLink className="mr-2 h-4 w-4" /> Preview</DropdownMenuItem>}
                                                        <DropdownMenuItem onSelect={() => handleSetClipboard(item, 'copy')}><Copy className="mr-2 h-4 w-4" /> Copy</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleSetClipboard(item, 'move')}><Move className="mr-2 h-4 w-4" /> Move</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setRenameData({ item, newName: item.name })}><Edit className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                                                        {item.type === 'file' && <DropdownMenuItem onSelect={() => handleDownload(item)}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>}
                                                        <DropdownMenuSeparator />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:!text-destructive focus:!text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete "{item.name}".</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{searchTerm ? `No results for "${searchTerm}"` : 'This folder is empty.'}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <Dialog open={dialogOpen.create} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, create: open })}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4"><Input value={createFolderName} onChange={(e) => setCreateFolderName(e.target.value)} placeholder="Folder name" onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} /></div>
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen({ ...dialogOpen, create: false })}>Cancel</Button><Button onClick={handleCreateFolder}>Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen.upload} onOpenChange={(open) => setDialogOpen({ ...dialogOpen, upload: open })}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Upload File</DialogTitle><DialogDescription>Select a file to upload to the current folder.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="file-upload">File</Label>
                        <Input id="file-upload" type="file" onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)} />
                        {isUploading && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Uploading...</p>
                                <Progress value={uploadProgress} />
                            </div>
                        )}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setDialogOpen({ ...dialogOpen, upload: false })}>Cancel</Button><Button onClick={handleUploadFile} disabled={!uploadFileObj || isUploading}>{isUploading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</>) : 'Upload'}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!renameData} onOpenChange={(open) => !open && setRenameData(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Rename Item</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4"><Input value={renameData?.newName || ''} onChange={(e) => renameData && setRenameData({ ...renameData, newName: e.target.value })} placeholder="New name" onKeyDown={(e) => e.key === 'Enter' && handleRename()} /></div>
                    <DialogFooter><Button variant="outline" onClick={() => setRenameData(null)}>Cancel</Button><Button onClick={handleRename}>Rename</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen.preview} onOpenChange={(open) => { if (!open) { setPreviewFile(null); } setDialogOpen({ ...dialogOpen, preview: open }); }}>
                <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
                    {previewFile && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{previewFile.item.name}</DialogTitle>
                                <DialogDescription>{previewFile.item.metadata.contentType} &middot; {formatBytes(previewFile.item.metadata.size)}</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 flex-1 overflow-auto"><PreviewContent fileUrl={previewFile.url} fileType={previewFile.item.metadata.contentType || ''} /></div>
                            <DialogFooter className="mt-4 flex-shrink-0"><Button onClick={() => handleDownload(previewFile.item)}><Download className="mr-2 h-4 w-4" />Download</Button><Button variant="outline" onClick={() => setDialogOpen({ ...dialogOpen, preview: false })}>Close</Button></DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
