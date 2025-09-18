

"use client";

import { useState, useEffect, useMemo } from "react";
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
import { type User, type UserDepartment, type Department } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Edit, Trash2, ShieldCheck, Store, Download, Eye, EyeOff, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { posPermissions, backOfficePermissions, type AnyPermission } from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";
import { db, auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, query, where, getDocs, addDoc } from "firebase/firestore";
import { updateUserPassword } from './actions';


const EMPTY_USER: Partial<User> = {
  name: "",
  email: "",
  department: "Cashier",
  password: "",
  avatar_url: "https://placehold.co/100x100.png",
  permissions: [],
  temp_access_given: false,
};

const EMPTY_DEPARTMENT: Partial<Department> = {
  name: "",
  permissions: [],
};

const allPosPermissions = Object.keys(posPermissions) as (keyof typeof posPermissions)[];
const allBackOfficePermissions = Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[];

const systemDepartments = ["Owner"];

export default function TeamPage() {
  const { users, setUsers, departments, setDepartments, getPermissionsForDepartment, loggedInUser } = useSettings();
  const [loading, setLoading] = useState(true);
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Partial<Department> | null>(null);
  const [selectedDepartmentPermissions, setSelectedDepartmentPermissions] = useState<AnyPermission[]>([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");

  const { toast } = useToast();

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return users;
    const lowercasedTerm = userSearchTerm.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(lowercasedTerm) ||
      user.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [users, userSearchTerm]);

  const filteredDepartments = useMemo(() => {
    if (!departmentSearchTerm) return departments;
    return departments.filter(department => department.name.toLowerCase().includes(departmentSearchTerm.toLowerCase()));
  }, [departments, departmentSearchTerm]);

  useEffect(() => {
    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (editingDepartment) {
        const departmentPerms = editingDepartment.permissions || [];
        setSelectedDepartmentPermissions(departmentPerms);
    }
  }, [editingDepartment]);

  const handleOpenUserDialog = (user: Partial<User> | null) => {
    const targetUser = user ? { ...user } : { ...EMPTY_USER };
    if (!user) {
        const defaultDepartment = departments.find(d => d.name === 'Cashier');
        targetUser.permissions = defaultDepartment?.permissions || [];
    }
    setEditingUser(targetUser);
    setPasswordVisible(false);
    setIsUserDialogOpen(true);
  };
  
  const handleUserDialogClose = (open: boolean) => {
    if (!open) {
      setEditingUser(null);
    }
    setIsUserDialogOpen(open);
  }

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser || !loggedInUser?.businessId) return;

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("password") as string;
    const departmentName = formData.get("department") as UserDepartment;

    const userData: Partial<User> = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        department: departmentName,
        permissions: getPermissionsForDepartment(departmentName),
        avatar_url: editingUser.avatar_url || EMPTY_USER.avatar_url!,
        businessId: loggedInUser.businessId,
        temp_access_given: editingUser.temp_access_given || false,
    };

    try {
        if ('id' in editingUser && editingUser.id) {
            const userId = editingUser.id;
            const firestoreData: any = { ...userData };
            
            if (newPassword && newPassword !== editingUser.password) {
                const result = await updateUserPassword(userId, newPassword);
                if (!result.success) {
                    throw new Error(result.error);
                }
                firestoreData.password = newPassword; // Also update password in Firestore for display
                toast({ title: "Password Updated", description: "The user's password has been successfully changed." });
            } else {
                firestoreData.password = editingUser.password;
            }

            await updateDoc(doc(db, 'users', userId), firestoreData);
            toast({ title: "User Updated", description: `${userData.name}'s details have been updated.` });
        } else {
            if (!newPassword) {
                toast({ title: "Password Required", description: "A password is required for new users.", variant: "destructive" });
                return;
            }
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email!, newPassword);
            const newAuthUser = userCredential.user;

            // Save user profile to Firestore
            const userDocRef = doc(db, "users", newAuthUser.uid);
            await setDoc(userDocRef, {
                ...userData,
                password: newPassword, // Storing for display as requested
                created_at: new Date().toISOString(),
            });

            // Re-sign in the owner to refresh their token and avoid session interruption
             if (loggedInUser && loggedInUser.email && loggedInUser.password) {
                try {
                    await signInWithEmailAndPassword(auth, loggedInUser.email, loggedInUser.password);
                } catch (reauthError) {
                     toast({
                        title: "Session Warning",
                        description: "Could not re-authenticate. You may need to sign in again.",
                        variant: "destructive",
                    });
                }
            } else {
                 toast({
                    title: "Session Warning",
                    description: "Could not re-authenticate admin. You may need to sign in again.",
                    variant: "destructive"
                });
            }

            toast({ title: "User Created", description: `User ${userData.name} has been created.` });
        }
        handleUserDialogClose(false);
    } catch(error: any) {
        console.error("Error saving user:", error);
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email is already registered. Please use a different email.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        toast({ title: "Error saving user", description: errorMessage, variant: "destructive" });
    }
  };


  const handleDeleteUser = async (userId: string) => {
    // Note: This only deletes the Firestore record, not the Firebase Auth user.
    // Proper deletion would require a server-side function.
    try {
        await deleteDoc(doc(db, 'users', userId));
        toast({
            title: "User Deleted",
            description: "The user has been removed from the team's database.",
            variant: "destructive"
        });
    } catch (error: any) {
        toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    }
  }

  const handleUserDepartmentChange = (departmentName: string) => {
    if(editingUser) {
        setEditingUser({ ...editingUser, department: departmentName as UserDepartment });
    }
  }
  
  // Department Handlers
  const handleOpenDepartmentDialog = (department: Partial<Department> | null) => {
    setEditingDepartment(department ? { ...department } : { ...EMPTY_DEPARTMENT });
    setIsDepartmentDialogOpen(true);
  };
  
  const handleDepartmentDialogClose = (open: boolean) => {
    if (!open) setEditingDepartment(null);
    setIsDepartmentDialogOpen(open);
  }
  
  const handleSaveDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDepartment || !loggedInUser?.businessId) return;
    const formData = new FormData(event.currentTarget);
    const departmentName = formData.get("name") as string;
    
    const departmentData = {
      name: departmentName,
      permissions: selectedDepartmentPermissions,
      businessId: loggedInUser.businessId,
    };
    
    try {
      if (editingDepartment.id) {
          const batch = writeBatch(db);
          const departmentDocRef = doc(db, 'departments', editingDepartment.id);
          batch.update(departmentDocRef, departmentData);
          
          const usersQuery = query(collection(db, 'users'), where('department', '==', editingDepartment.name), where('businessId', '==', loggedInUser.businessId));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach(userDoc => {
              batch.update(doc(db, 'users', userDoc.id), { permissions: selectedDepartmentPermissions });
          });
          
          await batch.commit();
          toast({ title: "Department Updated", description: `Permissions for all users in the '${departmentName}' department have been updated.` });
      } else {
          await addDoc(collection(db, 'departments'), {
              ...departmentData,
              id: doc(collection(db, 'departments')).id // Pre-generate ID to avoid conflict
          });
          toast({ title: "Department Added" });
      }
      handleDepartmentDialogClose(false);
    } catch(error: any) {
       toast({ title: "Error Saving Department", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    const departmentToDelete = departments.find(d => d.id === departmentId);
    if (!departmentToDelete || users.some(user => user.department === departmentToDelete.name)) {
        toast({ title: "Cannot Delete Department", description: "This department is assigned to one or more users.", variant: "destructive" });
        return;
    }
    try {
      await deleteDoc(doc(db, 'departments', departmentId));
      toast({ title: "Department Deleted" });
    } catch (error: any) {
      toast({ title: "Error deleting department", description: error.message, variant: "destructive" });
    }
  };
  
  const getDepartmentBadgeVariant = (department: UserDepartment): BadgeProps['variant'] => {
    switch (department) {
      case "Owner": return "destructive";
      case "Administrator": return "default";
      case "Manager": return "secondary";
      default: return "outline";
    }
  };

  const isDepartmentNameLocked = systemDepartments.includes(editingDepartment?.name || "");

  const handleExport = () => {
    const dataToExport = filteredUsers.map(u => ({
      "Name": u.name,
      "Email": u.email,
      "Department": u.department,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `team_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Team list has been downloaded." });
  };

  const renderPermissions = (
    permissions: AnyPermission[], 
    onToggle: (permission: AnyPermission, checked: boolean) => void,
    isLocked: boolean
    ) => (
    <ScrollArea className="h-72 p-4 border rounded-md">
        <div className="space-y-6">
            <div>
                <h4 className="flex items-center gap-2 text-md font-semibold mb-2"><Store className="h-5 w-5" />Point of Sale</h4>
                <div className="space-y-2">
                    {allPosPermissions.map(p => (
                        <div key={p} className="flex items-center justify-between">
                            <Label htmlFor={p} className="font-normal text-sm">{posPermissions[p].label}</Label>
                            <Switch id={p} checked={permissions.includes(p)} onCheckedChange={(c) => onToggle(p, c)} disabled={isLocked}/>
                        </div>
                    ))}
                </div>
            </div>
            <Separator />
            <div>
                <h4 className="flex items-center gap-2 text-md font-semibold mb-2"><ShieldCheck className="h-5 w-5" />Back Office</h4>
                <div className="space-y-2">
                    {allBackOfficePermissions.map(p => (
                        <div key={p} className="flex items-center justify-between">
                            <Label htmlFor={p} className="font-normal text-sm">{backOfficePermissions[p].label}</Label>
                            <Switch id={p} checked={permissions.includes(p)} onCheckedChange={(c) => onToggle(p, c)} disabled={isLocked}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Team Management" description="Manage your team members and their departments." />
      <Tabs defaultValue="users">
        <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>A list of all users in your system.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 self-end">
                            <Button onClick={handleExport} variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                            <Button onClick={() => handleOpenUserDialog(null)} size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add User</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                <div className="mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search users..."
                            className="pl-9"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Department</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                    <Avatar><AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="font-medium">{user.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant={getDepartmentBadgeVariant(user.department as UserDepartment)}>{user.department}</Badge></TableCell>
                                <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleOpenUserDialog(user)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteUser(user.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No users found.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="departments">
            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Departments</CardTitle>
                            <CardDescription>Define departments and their permissions for your team.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDepartmentDialog(null)} size="sm" className="self-end"><PlusCircle className="mr-2 h-4 w-4" />Add Department</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search departments..."
                                className="pl-9"
                                value={departmentSearchTerm}
                                onChange={(e) => setDepartmentSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Department Name</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {filteredDepartments.length > 0 ? (
                                filteredDepartments.map((department) => (
                                    <TableRow key={department.id}>
                                        <TableCell><Badge variant={getDepartmentBadgeVariant(department.name as UserDepartment)}>{department.name}</Badge></TableCell>
                                        <TableCell>{department.permissions.length} permissions</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDepartmentDialog(department)}><Edit className="h-4 w-4" /></Button>
                                            {!systemDepartments.includes(department.name) && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDepartment(department.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No departments found.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={isUserDialogOpen} onOpenChange={handleUserDialogClose}>
          <DialogContent className="sm:max-w-xl">
            <form onSubmit={handleSaveUser}>
              <DialogHeader>
                <DialogTitle>{editingUser?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>{editingUser?.id ? "Update the user's details and permissions." : "Fill in the details for a new team member."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={editingUser?.name} required /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={editingUser?.email} required /></div>
                  <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          name="password" 
                          type={passwordVisible ? "text" : "password"} 
                          placeholder={editingUser?.id ? "Leave blank to keep current" : ""}
                          defaultValue={editingUser?.password ?? ''}
                          required={!editingUser?.id} 
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 h-7 w-7" onClick={() => setPasswordVisible(!passwordVisible)}>
                          {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="department">Department</Label>
                      <Select name="department" required defaultValue={editingUser?.department} onValueChange={handleUserDepartmentChange}>
                      <SelectTrigger id="department"><SelectValue placeholder="Select a department" /></SelectTrigger>
                      <SelectContent>{departments.map(department => (<SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>))}</SelectContent>
                      </Select>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">Permissions are inherited from the assigned department. To change permissions, please edit the department.</p>
              </div>
              <DialogFooter className="pt-4"><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      <Dialog open={isDepartmentDialogOpen} onOpenChange={handleDepartmentDialogClose}>
          <DialogContent className="sm:max-w-4xl">
            <form onSubmit={handleSaveDepartment}>
              <DialogHeader>
                <DialogTitle>{editingDepartment?.id ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                <DialogDescription>{editingDepartment?.id ? "Update the department's details." : "Define a new department and assign permissions."}</DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-8 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="name">Department Name</Label><Input id="name" name="name" defaultValue={editingDepartment?.name} required disabled={isDepartmentNameLocked} /></div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-lg font-medium">Permissions</h3>
                       {renderPermissions(selectedDepartmentPermissions, (permission, checked) => {
                          setSelectedDepartmentPermissions(prev =>
                              checked ? [...prev, permission] : prev.filter(p => p !== permission)
                          );
                      }, isDepartmentNameLocked)}
                  </div>
              </div>
              <DialogFooter className="pt-4"><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}


    