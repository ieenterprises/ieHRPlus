
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
import { type User, type UserRole, type Role } from "@/lib/types";
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
  role: "Cashier",
  password: "",
  avatar_url: "https://placehold.co/100x100.png",
  permissions: [],
};

const EMPTY_ROLE: Partial<Role> = {
  name: "",
  permissions: [],
};

const allPosPermissions = Object.keys(posPermissions) as (keyof typeof posPermissions)[];
const allBackOfficePermissions = Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[];

const systemRoles = ["Owner"];

export default function TeamPage() {
  const { users, setUsers, roles, setRoles, getPermissionsForRole, loggedInUser } from useSettings();
  const [loading, setLoading] = useState(true);
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<AnyPermission[]>([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [roleSearchTerm, setRoleSearchTerm] = useState("");

  const { toast } = useToast();

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return users;
    const lowercasedTerm = userSearchTerm.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(lowercasedTerm) ||
      user.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [users, userSearchTerm]);

  const filteredRoles = useMemo(() => {
    if (!roleSearchTerm) return roles;
    return roles.filter(role => role.name.toLowerCase().includes(roleSearchTerm.toLowerCase()));
  }, [roles, roleSearchTerm]);

  useEffect(() => {
    setLoading(false);
  }, []);
  
  useEffect(() => {
    if (editingRole) {
        const rolePerms = editingRole.permissions || [];
        setSelectedRolePermissions(rolePerms);
    }
  }, [editingRole]);

  const handleOpenUserDialog = (user: Partial<User> | null) => {
    const targetUser = user ? { ...user } : { ...EMPTY_USER };
    if (!user) {
        const defaultRole = roles.find(r => r.name === 'Cashier');
        targetUser.permissions = defaultRole?.permissions || [];
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
    const roleName = formData.get("role") as UserRole;

    const userData: Partial<User> = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        role: roleName,
        permissions: getPermissionsForRole(roleName),
        avatar_url: editingUser.avatar_url || EMPTY_USER.avatar_url!,
        businessId: loggedInUser.businessId,
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

  const handleUserRoleChange = (roleName: string) => {
    if(editingUser) {
        setEditingUser({ ...editingUser, role: roleName as UserRole });
    }
  }
  
  // Role Handlers
  const handleOpenRoleDialog = (role: Partial<Role> | null) => {
    setEditingRole(role ? { ...role } : { ...EMPTY_ROLE });
    setIsRoleDialogOpen(true);
  };
  
  const handleRoleDialogClose = (open: boolean) => {
    if (!open) setEditingRole(null);
    setIsRoleDialogOpen(open);
  }
  
  const handleSaveRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRole || !loggedInUser?.businessId) return;
    const formData = new FormData(event.currentTarget);
    const roleName = formData.get("name") as string;
    
    const roleData = {
      name: roleName,
      permissions: selectedRolePermissions,
      businessId: loggedInUser.businessId,
    };
    
    try {
      if (editingRole.id) {
          const batch = writeBatch(db);
          const roleDocRef = doc(db, 'roles', editingRole.id);
          batch.update(roleDocRef, roleData);
          
          const usersQuery = query(collection(db, 'users'), where('role', '==', editingRole.name), where('businessId', '==', loggedInUser.businessId));
          const usersSnapshot = await getDocs(usersQuery);
          usersSnapshot.forEach(userDoc => {
              batch.update(doc(db, 'users', userDoc.id), { permissions: selectedRolePermissions });
          });
          
          await batch.commit();
          toast({ title: "Role Updated", description: `Permissions for all users with the '${roleName}' role have been updated.` });
      } else {
          await addDoc(collection(db, 'roles'), {
              ...roleData,
              id: doc(collection(db, 'roles')).id // Pre-generate ID to avoid conflict
          });
          toast({ title: "Role Added" });
      }
      handleRoleDialogClose(false);
    } catch(error: any) {
       toast({ title: "Error Saving Role", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete || users.some(user => user.role === roleToDelete.name)) {
        toast({ title: "Cannot Delete Role", description: "This role is assigned to one or more users.", variant: "destructive" });
        return;
    }
    try {
      await deleteDoc(doc(db, 'roles', roleId));
      toast({ title: "Role Deleted" });
    } catch (error: any) {
      toast({ title: "Error deleting role", description: error.message, variant: "destructive" });
    }
  };
  
  const getRoleBadgeVariant = (role: UserRole): BadgeProps['variant'] => {
    switch (role) {
      case "Owner": return "destructive";
      case "Administrator": return "default";
      case "Manager": return "secondary";
      default: return "outline";
    }
  };

  const isRoleNameLocked = systemRoles.includes(editingRole?.name || "");

  const handleExport = () => {
    const dataToExport = filteredUsers.map(u => ({
      "Name": u.name,
      "Email": u.email,
      "Role": u.role,
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
      <PageHeader title="Team Management" description="Manage your team members and their roles." />
      <Tabs defaultValue="users">
        <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
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
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
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
                                <TableCell><Badge variant={getRoleBadgeVariant(user.role as UserRole)}>{user.role}</Badge></TableCell>
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
        <TabsContent value="roles">
            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Roles</CardTitle>
                            <CardDescription>Define roles and their permissions for your team.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenRoleDialog(null)} size="sm" className="self-end"><PlusCircle className="mr-2 h-4 w-4" />Add Role</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search roles..."
                                className="pl-9"
                                value={roleSearchTerm}
                                onChange={(e) => setRoleSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Role Name</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                            {filteredRoles.length > 0 ? (
                                filteredRoles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell><Badge variant={getRoleBadgeVariant(role.name as UserRole)}>{role.name}</Badge></TableCell>
                                        <TableCell>{role.permissions.length} permissions</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenRoleDialog(role)}><Edit className="h-4 w-4" /></Button>
                                            {!systemRoles.includes(role.name) && (
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center">No roles found.</TableCell></TableRow>
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
                  <div className="space-y-2"><Label htmlFor="role">Role</Label>
                      <Select name="role" required defaultValue={editingUser?.role} onValueChange={handleUserRoleChange}>
                      <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                      <SelectContent>{roles.map(role => (<SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>))}</SelectContent>
                      </Select>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">Permissions are inherited from the assigned role. To change permissions, please edit the role.</p>
              </div>
              <DialogFooter className="pt-4"><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      <Dialog open={isRoleDialogOpen} onOpenChange={handleRoleDialogClose}>
          <DialogContent className="sm:max-w-4xl">
            <form onSubmit={handleSaveRole}>
              <DialogHeader>
                <DialogTitle>{editingRole?.id ? 'Edit Role' : 'Add New Role'}</DialogTitle>
                <DialogDescription>{editingRole?.id ? "Update the role's details." : "Define a new role and assign permissions."}</DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-8 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="name">Role Name</Label><Input id="name" name="name" defaultValue={editingRole?.name} required disabled={isRoleNameLocked} /></div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-lg font-medium">Permissions</h3>
                       {renderPermissions(selectedRolePermissions, (permission, checked) => {
                          setSelectedRolePermissions(prev =>
                              checked ? [...prev, permission] : prev.filter(p => p !== permission)
                          );
                      }, isRoleNameLocked)}
                  </div>
              </div>
              <DialogFooter className="pt-4"><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
