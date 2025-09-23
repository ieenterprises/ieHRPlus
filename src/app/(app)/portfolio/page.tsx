
"use client";

import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type User, type FileItem } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UploadCloud, Edit, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { listItems, uploadFile, getPublicUrl, deleteItem } from "@/lib/firebase-storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AttachmentPreviewer } from "@/components/attachment-previewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { getStorage, ref, deleteObject } from "firebase/storage";


export default function PortfolioPage() {
  const { users, currency, loggedInUser } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const { toast } = useToast();
  const storage = getStorage();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(lowercasedTerm) ||
      user.email.toLowerCase().includes(lowercasedTerm) ||
      user.departmentName?.toLowerCase().includes(lowercasedTerm)
    );
  }, [users, searchTerm]);

  const fetchUserFiles = useCallback(async (user: User) => {
    if (!user?.id || !loggedInUser?.businessId) return;
    try {
        const files = await listItems(loggedInUser.businessId, user.id, 'documents');
        setUserFiles(files);
    } catch(e) {
        console.error("Could not fetch user documents: ", e);
        setUserFiles([]);
    }
  }, [loggedInUser?.businessId]);

  const handleOpenDialog = async (user: User) => {
    setEditingUser(user);
    await fetchUserFiles(user);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    setUserFiles([]);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !editingUser || !loggedInUser?.businessId) return;
    
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File Type", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const folder = `profile_pictures`;
      const fileName = `${editingUser.id}_${Date.now()}.${file.name.split('.').pop()}`;
      
      await uploadFile(loggedInUser.businessId, editingUser.id, folder, new File([file], fileName), () => {});
      const publicUrl = await getPublicUrl(loggedInUser.businessId, [loggedInUser.businessId, 'user_files', editingUser.id, folder, fileName].join('/'));

      await updateDoc(doc(db, "users", editingUser.id), { avatar_url: publicUrl });

      setEditingUser(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Profile Photo Updated" });

    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

    const handleDeletePhoto = async () => {
        if (!editingUser?.avatar_url || !loggedInUser?.businessId) return;

        setIsUploading(true); // Reuse uploading state to disable buttons
        try {
            // 1. Delete from Firebase Storage
            const fileRef = ref(storage, editingUser.avatar_url);
            await deleteObject(fileRef);
        
            // 2. Update Firestore
            await updateDoc(doc(db, "users", editingUser.id), { avatar_url: "" });

            // 3. Update local state
            setEditingUser(prev => prev ? { ...prev, avatar_url: "" } : null);
            toast({ title: "Profile Photo Deleted" });

        } catch (error: any) {
            console.error("Error deleting photo:", error);
            if (error.code === 'storage/object-not-found') {
                 // If file is not in storage, just clear it from DB
                 await updateDoc(doc(db, "users", editingUser.id), { avatar_url: "" });
                 setEditingUser(prev => prev ? { ...prev, avatar_url: "" } : null);
                 toast({ title: "Profile Photo Removed", description: "The photo link was broken and has been cleared." });
            } else {
                toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
            }
        } finally {
            setIsUploading(false);
        }
    };


  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !editingUser || !loggedInUser?.businessId) return;
    
    const file = event.target.files[0];

    setIsUploading(true);
    try {
      await uploadFile(loggedInUser.businessId, editingUser.id, 'documents', file, () => {});
      toast({ title: "Document Uploaded", description: `${file.name} has been added to the employee's portfolio.` });
      await fetchUserFiles(editingUser); // Refresh file list

    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSaveChanges = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(event.currentTarget);
    const newRemuneration = parseFloat(formData.get("remuneration") as string);
    
    if (isNaN(newRemuneration)) {
        toast({ title: "Invalid Input", description: "Please enter a valid number for remuneration.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
        await updateDoc(doc(db, "users", editingUser.id), { remuneration: newRemuneration });
        setEditingUser(prev => prev ? { ...prev, remuneration: newRemuneration } : null);
        toast({ title: "Portfolio Updated" });
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (file: FileItem) => {
    if (!editingUser || !loggedInUser?.businessId) return;
    try {
        await deleteItem(loggedInUser.businessId, editingUser.id, file, 'documents');
        toast({ title: "Document Deleted" });
        await fetchUserFiles(editingUser); // Refresh file list
    } catch(e: any) {
        toast({ title: "Deletion Failed", description: e.message, variant: "destructive" });
    }
  };


  return (
    <div className="space-y-8">
      <PageHeader title="Employee Portfolios" description="View and manage detailed portfolios for each team member." />
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>A list of all users in your system.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, department..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Remuneration</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{user.name}</span>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.departmentName || 'N/A'}</TableCell>
                      <TableCell>
                        {user.remuneration != null ? `${currency}${user.remuneration.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(user)}>
                          <Edit className="mr-2 h-4 w-4" /> Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Portfolio: {editingUser?.name}</DialogTitle>
                <DialogDescription>View and manage this employee's details and documents.</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleSaveChanges} className="flex-1 min-h-0 flex flex-col">
                <div className="grid md:grid-cols-2 gap-8 py-4 flex-1 min-h-0">
                    {/* Left Column: Details & Photo */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-24 h-24">
                                        <Image src={editingUser.avatar_url || 'https://placehold.co/100x100.png'} alt={editingUser.name} fill className="rounded-full object-cover" data-ai-hint="person portrait" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="photo-upload" className={
                                            `inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 cursor-pointer ${isUploading ? 'bg-secondary' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`
                                        }>
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                                            Upload Photo
                                        </Label>
                                        <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                                        {editingUser.avatar_url && (
                                            <Button variant="destructive" size="sm" type="button" onClick={handleDeletePhoto} disabled={isUploading}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Photo
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm space-y-2">
                                    <p><strong>Role:</strong> {editingUser.role}</p>
                                    <p><strong>Department:</strong> {editingUser.departmentName || 'N/A'}</p>
                                    <div className="space-y-2">
                                        <Label htmlFor="remuneration" className="font-bold">Remuneration</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">{currency}</span>
                                            <Input id="remuneration" name="remuneration" type="number" step="0.01" defaultValue={editingUser.remuneration} className="w-32" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Documents */}
                    <div className="space-y-6 flex flex-col">
                       <Card className="flex-1 flex flex-col">
                           <CardHeader>
                               <div className="flex items-center justify-between">
                                 <CardTitle>Personal Documents</CardTitle>
                                 <Button asChild variant="outline" size="sm">
                                     <Label htmlFor="doc-upload" className="cursor-pointer">
                                        <UploadCloud className="mr-2 h-4 w-4" /> Upload
                                     </Label>
                                 </Button>
                                 <Input id="doc-upload" type="file" className="hidden" onChange={handleDocumentUpload} disabled={isUploading} />
                               </div>
                           </CardHeader>
                           <CardContent className="flex-1 min-h-0">
                                <ScrollArea className="h-full">
                                    {userFiles.length > 0 ? (
                                        <AttachmentPreviewer attachments={userFiles.map(f => ({ name: f.name, url: ''}))} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-center text-muted-foreground text-sm">
                                            <p>No documents uploaded for this employee.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                           </CardContent>
                       </Card>
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" type="button" onClick={handleCloseDialog}>Close</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
}


    