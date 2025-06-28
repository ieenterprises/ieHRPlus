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
import { type User, type UserRole } from "@/lib/types";
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


const EMPTY_USER: Partial<User> = {
  name: "",
  email: "",
  role: "Cashier",
  avatar_url: "https://placehold.co/100x100.png",
  pin: "",
};

const MOCK_USERS: User[] = [
    { id: "user_1", name: "Admin", email: "admin@orderflow.com", role: "Owner", pin: "1111", permissions: [], avatar_url: 'https://placehold.co/100x100.png', created_at: "2023-01-01T10:00:00Z" },
    { id: "user_2", name: "John Cashier", email: "john.c@orderflow.com", role: "Cashier", pin: "1234", permissions: [], avatar_url: 'https://placehold.co/100x100.png', created_at: "2023-01-01T10:00:00Z" },
    { id: "user_3", name: "Jane Manager", email: "jane.m@orderflow.com", role: "Manager", pin: "4321", permissions: [], avatar_url: 'https://placehold.co/100x100.png', created_at: "2023-01-01T10:00:00Z" },
];


export default function TeamPage() {
  const [team, setTeam] = useState<User[]>(MOCK_USERS);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const { toast } = useToast();

  const handleOpenDialog = (user: Partial<User> | null) => {
    setEditingUser(user ? user : EMPTY_USER);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingUser(null);
    }
    setIsDialogOpen(open);
  }

  const handleSaveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const userData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as UserRole,
      pin: formData.get("pin") as string,
      permissions: [], // Permissions handled by role for now
    };

    try {
        if (editingUser?.id) {
            setTeam(team.map(u => u.id === editingUser.id ? { ...u, ...userData, permissions: u.permissions } as User : u));
            toast({ title: "User Updated", description: `${userData.name}'s details have been updated.` });
        } else {
            const newUser: User = { 
                id: `user_${new Date().getTime()}`,
                avatar_url: EMPTY_USER.avatar_url!,
                created_at: new Date().toISOString(),
                ...userData, 
            };
            setTeam([newUser, ...team]);
            toast({ title: "User Added", description: `${newUser.name} has been added to the team.` });
        }
        handleDialogClose(false);
    } catch(error: any) {
        toast({ title: "Error saving user", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
        setTeam(team.filter(u => u.id !== userId));
        toast({
            title: "User Deleted",
            description: "The user has been removed from the team.",
            variant: "destructive"
        });
    } catch (error: any) {
        toast({ title: "Error deleting user", description: "An unexpected error occurred", variant: "destructive" });
    }
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
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : team.length > 0 ? (
                team.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.avatar_url || ''} alt={user.name} data-ai-hint="person portrait" />
                            <AvatarFallback>
                            {user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role as UserRole)}>
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
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No users found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSaveUser}>
              <DialogHeader>
                <DialogTitle>{editingUser?.id ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser?.id ? "Update the user's details and permissions." : "Fill in the details to add a new member to your team."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
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
                    defaultValue={editingUser?.pin || ''} 
                    required 
                    pattern="\\d{4}" 
                    maxLength={4} 
                    title="PIN must be 4 digits."
                  />
                </div>
              </div>
                            
              <DialogFooter className="pt-4">
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
