
"use client";

import { useState, useEffect } from "react";
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
import { MoreHorizontal, PlusCircle, Edit, Trash2, ShieldCheck, Store } from "lucide-react";
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

const EMPTY_USER: Partial<User> = {
  name: "",
  email: "",
  role: "Cashier",
  avatar_url: "https://placehold.co/100x100.png",
  permissions: [],
  pin: "",
};

const EMPTY_ROLE: Partial<Role> = {
  name: "",
  permissions: [],
};

const allPosPermissions = Object.keys(posPermissions) as (keyof typeof posPermissions)[];
const allBackOfficePermissions = Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[];

const systemRoles = ["Owner", "Administrator"];

export default function TeamPage() {
  const { users, setUsers, roles, setRoles, getPermissionsForRole } = useSettings();
  const [loading, setLoading] = useState(true);
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<AnyPermission[]>([]);
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<AnyPermission[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (editingUser) {
        setSelectedUserPermissions(editingUser.permissions || []);
    }
  }, [editingUser]);
  
  useEffect(() => {
    if (editingRole) {
        setSelectedRolePermissions(editingRole.permissions || []);
    }
  }, [editingRole]);

  const handleOpenUserDialog = (user: Partial<User> | null) => {
    const targetUser = user ? { ...user } : { ...EMPTY_USER };
    if (!user) {
        const defaultRole = roles.find(r => r.name === 'Cashier');
        targetUser.permissions = defaultRole?.permissions || [];
    }
    setEditingUser(targetUser);
    setIsUserDialogOpen(true);
  };
  
  const handleUserDialogClose = (open: boolean) => {
    if (!open) {
      setEditingUser(null);
      setSelectedUserPermissions([]);
    }
    setIsUserDialogOpen(open);
  }

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(event.currentTarget);
    
    const userData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as UserRole,
      pin: formData.get("pin") as string,
      permissions: selectedUserPermissions,
      avatar_url: editingUser.avatar_url || EMPTY_USER.avatar_url!,
    };

    try {
        if ('id' in editingUser && editingUser.id) {
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userData } as User : u));
            toast({ title: "User Updated", description: `${userData.name}'s details have been updated.` });
        } else {
            const newUser = {
              ...userData,
              id: `user_${new Date().getTime()}`,
              created_at: new Date().toISOString(),
            }
            setUsers(prevUsers => [...prevUsers, newUser]);
            toast({ title: "User Created", description: `User ${userData.name} has been created.` });
        }
        handleUserDialogClose(false);
    } catch(error: any) {
        toast({ title: "Error saving user", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
        setUsers(users.filter(u => u.id !== userId));
        toast({
            title: "User Deleted",
            description: "The user has been removed from the team.",
            variant: "destructive"
        });
    } catch (error: any) {
        toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    }
  }

  const handleUserRoleChange = (roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    if(role) {
      setEditingUser(prev => ({ ...prev, role: role.name as UserRole, permissions: role.permissions }));
      setSelectedUserPermissions(role.permissions);
    }
  }
  
  const handleUserPermissionToggle = (permission: AnyPermission, checked: boolean) => {
    setSelectedUserPermissions(prev =>
        checked ? [...prev, permission] : prev.filter(p => p !== permission)
    );
  }

  // Role Handlers (remains the same, using localStorage via useSettings)
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
    if (!editingRole) return;
    const formData = new FormData(event.currentTarget);
    const roleData = {
      name: formData.get("name") as string,
      permissions: selectedRolePermissions,
    };
    if (editingRole.id) {
        setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...roleData } as Role : r));
        toast({ title: "Role Updated" });
    } else {
        setRoles([...roles, { id: `role_${new Date().getTime()}`, ...roleData }]);
        toast({ title: "Role Added" });
    }
    handleRoleDialogClose(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete || users.some(user => user.role === roleToDelete.name)) {
        toast({ title: "Cannot Delete Role", description: "This role is assigned to one or more users.", variant: "destructive" });
        return;
    }
    setRoles(roles.filter(r => r.id !== roleId));
    toast({ title: "Role Deleted" });
  };
  
  const handleRolePermissionToggle = (permission: AnyPermission, checked: boolean) => {
    setSelectedRolePermissions(prev =>
        checked ? [...prev, permission] : prev.filter(p => p !== permission)
    );
  }

  const getRoleBadgeVariant = (role: UserRole): BadgeProps['variant'] => {
    switch (role) {
      case "Owner": return "destructive";
      case "Administrator": return "default";
      case "Manager": return "secondary";
      default: return "outline";
    }
  };

  const isUserPermissionLocked = systemRoles.includes(editingUser?.role || "");
  const isRolePermissionLocked = systemRoles.includes(editingRole?.name || "");

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
      <PageHeader title="Team Management" description="Manage your team members and their roles and permissions." />
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
            <Card>
                <CardHeader className="relative">
                    <CardTitle>Users</CardTitle>
                    <CardDescription>A list of all users in your system.</CardDescription>
                    <div className="absolute top-6 right-6">
                        <Button onClick={() => handleOpenUserDialog(null)}><PlusCircle className="mr-2 h-4 w-4" />Add User</Button>
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
                    ) : users.length > 0 ? (
                        users.map((user) => (
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
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="roles">
            <Card>
                <CardHeader className="relative">
                    <CardTitle>Roles</CardTitle>
                    <CardDescription>Define roles and their permissions for your team.</CardDescription>
                    <div className="absolute top-6 right-6">
                        <Button onClick={() => handleOpenRoleDialog(null)}><PlusCircle className="mr-2 h-4 w-4" />Add Role</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Role Name</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                         {roles.length > 0 ? (
                            roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell><Badge variant={getRoleBadgeVariant(role.name as UserRole)}>{role.name}</Badge></TableCell>
                                    <TableCell>{role.permissions.length} permissions</TableCell>
                                    <TableCell className="text-right">
                                       {!systemRoles.includes(role.name) && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenRoleDialog(role)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">No roles found.</TableCell></TableRow>
                         )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={isUserDialogOpen} onOpenChange={handleUserDialogClose}>
          <DialogContent className="sm:max-w-4xl">
            <form onSubmit={handleSaveUser}>
              <DialogHeader>
                <DialogTitle>{editingUser?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>{editingUser?.id ? "Update the user's details and permissions." : "Fill in the details for a new team member."}</DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-8 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={editingUser?.name} required /></div>
                    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={editingUser?.email} required /></div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" placeholder={editingUser?.id ? "Leave blank to keep current password" : "Required for new user"} required={!editingUser?.id} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pin">4-Digit PIN</Label>
                        <Input id="pin" name="pin" type="text" pattern="\d{4}" maxLength={4} placeholder="e.g., 1234" defaultValue={editingUser?.pin || ""} required />
                    </div>
                    <div className="space-y-2"><Label htmlFor="role">Role</Label>
                        <Select name="role" required defaultValue={editingUser?.role} onValueChange={handleUserRoleChange}>
                        <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                        <SelectContent>{roles.map(role => (<SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-lg font-medium">Permissions</h3>
                      {renderPermissions(selectedUserPermissions, handleUserPermissionToggle, isUserPermissionLocked)}
                  </div>
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
                    <div className="space-y-2"><Label htmlFor="name">Role Name</Label><Input id="name" name="name" defaultValue={editingRole?.name} required disabled={isRolePermissionLocked} /></div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="text-lg font-medium">Permissions</h3>
                      {renderPermissions(selectedRolePermissions, handleRolePermissionToggle, isRolePermissionLocked)}
                  </div>
              </div>
              <DialogFooter className="pt-4"><Button type="submit">Save Changes</Button></DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}

    
