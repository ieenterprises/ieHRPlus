
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
import { products as initialProducts, categories as initialCategories, type Product, type Category } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const EMPTY_PRODUCT: Partial<Product> = {
  name: "",
  category: "",
  price: 0,
  stock: 0,
  imageUrl: "https://placehold.co/300x200.png",
};

const EMPTY_CATEGORY: Partial<Category> = {
  name: "",
};


export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  
  const { toast } = useToast();

  const getCategoryName = (categoryId: string) => {
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
  
  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
    toast({ title: "Product Deleted", description: "The product has been removed from inventory." });
  };
  
  const handleProductDialogClose = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
    }
    setIsProductDialogOpen(open);
  }

  const handleProductFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productData: Partial<Product> = {
        id: editingProduct?.id,
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        price: parseFloat(formData.get("price") as string),
        stock: parseInt(formData.get("stock") as string, 10),
    };

    if (productData.id && productData.id !== '') {
        setProducts(products.map(p => p.id === productData.id ? { ...p, ...productData } as Product : p));
        toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
    } else {
        const newProduct: Product = {
            id: `prod-${Date.now()}`,
            ...EMPTY_PRODUCT,
            ...productData
        } as Product;
        setProducts([newProduct, ...products]);
        toast({ title: "Product Added", description: `${newProduct.name} has been added to inventory.` });
    }
    
    handleProductDialogClose(false);
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

  const handleDeleteCategory = (categoryId: string) => {
    if (products.some((p) => p.category === categoryId)) {
      toast({
        title: "Cannot Delete Category",
        description: "This category is in use by one or more products.",
        variant: "destructive",
      });
      return;
    }
    setCategories(categories.filter((c) => c.id !== categoryId));
    toast({ title: "Category Deleted" });
  };

  const handleCategoryDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCategory(null);
    }
    setIsCategoryDialogOpen(open);
  };

  const handleCategoryFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categoryData: Partial<Category> = {
      id: editingCategory?.id,
      name: formData.get("name") as string,
    };

    if (categoryData.id) {
      setCategories(
        categories.map((c) =>
          c.id === categoryData.id ? ({ ...c, ...categoryData } as Category) : c
        )
      );
      toast({ title: "Category Updated" });
    } else {
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        name: categoryData.name!,
      };
      setCategories([...categories, newCategory]);
      toast({ title: "Category Added" });
    }
    handleCategoryDialogClose(false);
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
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>{getCategoryName(product.category)}</TableCell>
                                    <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{product.category === 'room' ? 'N/A' : product.stock}</TableCell>
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
                                ))}
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
                                {categories.filter(c => c.id !== 'room').map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {categories.filter(c => c.id !== 'room').length === 0 && (
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
                    <Select name="category" required defaultValue={editingProduct?.category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} disabled={category.id === 'room'}>
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

    