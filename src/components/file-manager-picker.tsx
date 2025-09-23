
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MoreVertical, Folder, File as FileIconLucide, Home, ChevronRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileItem as StorageFileItem, Attachment } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { listItems, getPublicUrl } from '@/lib/firebase-storage';
import { FileIcon } from '@/components/file-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/use-settings';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

interface FileManagerPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (files: Attachment[]) => void;
    multiple?: boolean;
}

export function FileManagerPickerDialog({ open, onOpenChange, onSelect, multiple = true }: FileManagerPickerProps) {
    const [path, setPath] = useState<string>('');
    const [items, setItems] = useState<StorageFileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<Attachment[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const { toast } = useToast();
    const { loggedInUser, loadingUser } = useSettings();
    const businessId = loggedInUser?.businessId;
    const userId = loggedInUser?.id;

    const fetchItems = useCallback(async () => {
        if (!businessId || !userId) return;
        setIsLoading(true);
        try {
            const fetchedItems = await listItems(businessId, userId, path);
            setItems(fetchedItems);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error fetching files', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [path, toast, businessId, userId]);

    useEffect(() => {
        if (open && !loadingUser && businessId && userId) {
            fetchItems();
        }
        // Reset state when dialog closes
        if (!open) {
            setPath('');
            setSelectedFiles([]);
            setSearchTerm('');
        }
    }, [open, fetchItems, loadingUser, businessId, userId]);
    
    const handleItemClick = (item: StorageFileItem) => {
        if (item.type === 'folder') {
            setPath(prev => `${prev ? prev + '/' : ''}${item.name}`);
        } else {
            handleToggleFileSelection(item);
        }
    };
    
    const handleToggleFileSelection = async (item: StorageFileItem) => {
        if (!businessId || !userId) return;
        
        const isSelected = selectedFiles.some(f => f.name === item.name);

        if (isSelected) {
            setSelectedFiles(prev => prev.filter(f => f.name !== item.name));
        } else {
             const itemPath = [businessId, 'user_files', userId, path, item.name].filter(Boolean).join('/');
             const url = await getPublicUrl(businessId, itemPath);
            const newFile: Attachment = { name: item.name, url };

            if (multiple) {
                setSelectedFiles(prev => [...prev, newFile]);
            } else {
                setSelectedFiles([newFile]);
            }
        }
    };

    const handleConfirmSelection = () => {
        onSelect(selectedFiles);
        onOpenChange(false);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select from File Manager</DialogTitle>
                    <DialogDescription>Choose one or more files to attach.</DialogDescription>
                </DialogHeader>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 overflow-x-auto whitespace-nowrap">
                    <button onClick={() => setPath('')} className="flex items-center gap-1 hover:text-primary" disabled={isLoading}><Home className="h-4 w-4" />My Files</button>
                    {pathSegments.length > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                    {pathSegments.map((segment, index) => (
                        <div key={segment.path} className="flex items-center gap-2">
                            <button onClick={() => setPath(segment.path)} className="hover:text-primary" disabled={isLoading}>{segment.name}</button>
                            {index < pathSegments.length - 1 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                        </div>
                    ))}
                </div>

                <ScrollArea className="flex-1 border rounded-md">
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                        ) : sortedItems.length > 0 ? (
                            sortedItems.map(item => (
                                <div
                                    key={item.name}
                                    onClick={() => handleItemClick(item)}
                                    className={`relative group p-2 border rounded-md flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/50 ${selectedFiles.some(f => f.name === item.name) ? 'ring-2 ring-primary' : ''}`}
                                >
                                    <FileIcon item={item} className="h-10 w-10 mb-2 text-muted-foreground" />
                                    <p className="text-xs font-medium truncate w-full">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.type === 'file' ? formatBytes(item.metadata.size) : 'Folder'}</p>
                                    {item.type === 'file' && (
                                        <div className="absolute top-1 right-1">
                                            <Checkbox
                                                checked={selectedFiles.some(f => f.name === item.name)}
                                                onCheckedChange={() => handleToggleFileSelection(item)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground">
                                This folder is empty.
                            </div>
                        )}
                    </div>
                </ScrollArea>
                
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleConfirmSelection} disabled={selectedFiles.length === 0}>
                        <Check className="mr-2 h-4 w-4" />
                        Confirm Selection ({selectedFiles.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
