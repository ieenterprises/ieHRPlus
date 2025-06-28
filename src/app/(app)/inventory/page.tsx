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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Product, type Category } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory } from "@/app/actions/inventory";


const EMPTY_PRODUCT: Partial<Product> = {
  name: "",
  category_id: "",
  price: 0,
  stock: 0,
  image_url: "https://placehold.co/300x200.png",
};

const EMPTY_CATEGORY: Partial<Category> = {
  name: "",
};


export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        if (!supabase) {
            setLoading(false);
            return;
        }
        const [productsRes, categoriesRes] = await Promise.all([
            supabase.from('products').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('name')
        ]);

        if (productsRes.error) toast({ title: "Error fetching products", description: productsRes.error.message, variant: "destructive" });
        else setProducts(productsRes.data as Product[]);

        if (categoriesRes.error) toast({ title: "Error fetching categories", description: categoriesRes.error.message, variant: "destructive" });
        else setCategories(categoriesRes.data as Category[]);

        setLoading(false);
    };
    fetchData();
  }, [toast]);


  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "N/A";
    return categories.find(c => c.id === categoryId)?.name || "N/A";
  };
  
  // Product Handlers
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };
  
  const handleAddProduct = () => {
    setEditingProduct(EMPTY_PRODUCT);
    setIsProductDialogOpen(true);
  }
  
  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      toast({ title: "Product Deleted", description: "The product has been removed from inventory." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleProductDialogClose = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
    }
    setIsProductDialogOpen(open);
  }

  const handleProductFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productData = {
        name: formData.get("name") as string,
        category_id: formData.get("category") as string,
        price: parseFloat(formData.get("price") as string),
        stock: parseInt(formData.get("stock") as string, 10),
    };

    try {
        if (editingProduct?.id) {
            await updateProduct(editingProduct.id, productData);
            setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
            toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
        } else {
            const newProduct = await addProduct(productData);
            setProducts([newProduct as Product, ...products]);
            toast({ title: "Product Added", description: `${newProduct.name} has been added to inventory.` });
        }
        handleProductDialogClose(false);
    } catch (error: any) {
         toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Category Handlers
  const handleAddCategory = () => {
    setEditingCategory(EMPTY_CATEGORY);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (products.some((p) => p.category_id === categoryId)) {
      toast({
        title: "Cannot Delete Category",
        description: "This category is in use by one or more products.",
        variant: "destructive",
      });
      return;
    }
    try {
        await deleteCategory(categoryId);
        setCategories(categories.filter((c) => c.id !== categoryId));
        toast({ title: "Category Deleted" });
    } catch(error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCategoryDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCategory(null);
    }
    setIsCategoryDialogOpen(open);
  };

  const handleCategoryFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categoryData = {
      name: formData.get("name") as string,
    };

    try {
        if (editingCategory?.id) {
            await updateCategory(editingCategory.id, categoryData);
            setCategories(categories.map((c) => c.id === editingCategory.id ? ({ ...c, ...categoryData } as Category) : c));
            toast({ title: "Category Updated" });
        } else {
            const newCategory = await addCategory(categoryData);
            setCategories([...categories, newCategory as Category]);
            toast({ title: "Category Added" });
        }
        handleCategoryDialogClose(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  return (
    <div className="space-y-8">
        <PageHeader
          title="Inventory Management"
          description="Manage your products and categories."
        />

        <Tabs defaultValue="products">
            <TabsList className="mb-4">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="products">
                <Card>
                    <CardHeader className="relative">
                        <CardTitle>Products</CardTitle>
                        <CardDescription>
                            A list of all products in your inventory.
                        </CardDescription>
                        <div className="absolute top-6 right-6">
                            <Button onClick={handleAddProduct}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Product
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : products.length > 0 ? (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{getCategoryName(product.category_id)}</TableCell>
                                        <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{getCategoryName(product.category_id) === 'Room' ? 'N/A' : product.stock}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No products found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="categories">
                 <Card>
                    <CardHeader className="relative">
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                            A list of all product categories.
                        </CardDescription>
                         <div className="absolute top-6 right-6">
                            <Button onClick={handleAddCategory}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Category
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {loading ? (
                                     <TableRow><TableCell colSpan={2} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : categories.length > 0 ? (
                                    categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                      No categories created yet.
                                    </TableCell>
                                  </TableRow>
                                )}
                             </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
      
      <Dialog open={isProductDialogOpen} onOpenChange={handleProductDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleProductFormSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct?.id ? 'Update the details of this product.' : 'Fill in the details to add a new product.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" defaultValue={editingProduct?.name} className="col-span-3" required />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Select name="category" required defaultValue={editingProduct?.category_id ?? ""}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">Price ($)</Label>
                  <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock" className="text-right">Stock</Label>
                  <Input id="stock" name="stock" type="number" step="1" defaultValue={editingProduct?.stock} className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isCategoryDialogOpen} onOpenChange={handleCategoryDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCategoryFormSubmit}>
              <DialogHeader>
                <DialogTitle>{editingCategory?.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory?.id ? 'Update the category name.' : 'Enter the name for the new category.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" defaultValue={editingCategory?.name} className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

    </div>
  );
}
