
"use client";

import { useState } from "react";
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
import { users as initialUsers, type User, type UserRole } from "@/lib/data";
import { posPermissions, backOfficePermissions, AnyPermission } from "@/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Edit, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const EMPTY_USER: Partial<User> = {
  name: "",
  email: "",
  role: "Cashier",
  avatarUrl: "https://placehold.co/100x100.png",
  permissions: [],
  pin: "",
};


export default function TeamPage() {
  const [team, setTeam] = useState<User[]>(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<AnyPermission>>(new Set());
  const { toast } = useToast();

  const handleOpenDialog = (user: Partial<User> | null) => {
    if (user && 'permissions' in user) {
      setEditingUser(user);
      setSelectedPermissions(new Set(user.permissions));
    } else {
      setEditingUser(EMPTY_USER);
      setSelectedPermissions(new Set());
    }
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingUser(null);
      setSelectedPermissions(new Set());
    }
    setIsDialogOpen(open);
  }

  const handlePermissionToggle = (permission: AnyPermission, checked: boolean) => {
    setSelectedPermissions(prev => {
        const newPermissions = new Set(prev);
        if (checked) {
            newPermissions.add(permission);
        } else {
            newPermissions.delete(permission);
        }
        return newPermissions;
    });
  };

  const handleSaveUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const userData: Partial<User> = {
      id: editingUser?.id,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as UserRole,
      pin: formData.get("pin") as string,
      permissions: Array.from(selectedPermissions),
    };

    if (userData.id) {
        setTeam(team.map(u => u.id === userData.id ? { ...u, ...userData } as User : u));
        toast({ title: "User Updated", description: `${userData.name}'s details have been updated.` });
    } else {
        const newUser: User = {
            id: `user-${Date.now()}`,
            avatarUrl: EMPTY_USER.avatarUrl!,
            ...userData
        } as User;
        setTeam([newUser, ...team]);
        toast({ title: "User Added", description: `${newUser.name} has been added to the team.` });
    }
    
    handleDialogClose(false);
  };

  const handleDeleteUser = (userId: string) => {
    setTeam(team.filter(u => u.id !== userId));
    toast({
        title: "User Deleted",
        description: "The user has been removed from the team.",
        variant: "destructive"
    });
  }

  const getRoleBadgeVariant = (role: UserRole): BadgeProps['variant'] => {
    switch (role) {
      case "Owner":
        return "destructive";
      case "Administrator":
        return "default";
      case "Manager":
        return "secondary";
      case "Cashier":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Team Management"
          description="Manage your cashiers, managers, and their permissions."
        />
        <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all users in your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person portrait" />
                        <AvatarFallback>
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-xl">
            <form onSubmit={handleSaveUser}>
              <DialogHeader>
                <DialogTitle>{editingUser?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser?.id ? "Update the user's details and permissions." : "Fill in the details to add a new member to your team."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={editingUser?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingUser?.email} required />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="role">Role</Label>
                   <Select name="role" required defaultValue={editingUser?.role}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="pin">POS PIN</Label>
                  <Input 
                    id="pin" 
                    name="pin" 
                    type="password" 
                    defaultValue={editingUser?.pin} 
                    required 
                    pattern="\d{4}" 
                    maxLength={4} 
                    title="PIN must be 4 digits."
                  />
                </div>
              </div>
              
              <Accordion type="multiple" className="w-full" defaultValue={['pos', 'back-office']}>
                <AccordionItem value="pos">
                    <AccordionTrigger className="text-lg font-semibold">POS Permissions</AccordionTrigger>
                    <AccordionContent>
                        <ScrollArea className="h-48">
                            <div className="space-y-4 p-1 pr-4">
                                {(Object.keys(posPermissions) as (keyof typeof posPermissions)[]).map((key) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="flex-1 pr-4">{posPermissions[key].label}</Label>
                                        <Switch
                                            id={key}
                                            checked={selectedPermissions.has(key)}
                                            onCheckedChange={(checked) => handlePermissionToggle(key, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="back-office">
                    <AccordionTrigger className="text-lg font-semibold">Back Office Permissions</AccordionTrigger>
                    <AccordionContent>
                         <ScrollArea className="h-48">
                            <div className="space-y-4 p-1 pr-4">
                                {(Object.keys(backOfficePermissions) as (keyof typeof backOfficePermissions)[]).map((key) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="flex-1 pr-4">{backOfficePermissions[key].label}</Label>
                                        <Switch
                                            id={key}
                                            checked={selectedPermissions.has(key)}
                                            onCheckedChange={(checked) => handlePermissionToggle(key, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <DialogFooter className="pt-4">
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
