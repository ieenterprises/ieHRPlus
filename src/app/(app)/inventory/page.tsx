
"use client";

import { useState } from "react";
import Image from "next/image";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Product, type Category } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Papa from "papaparse";


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

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'Food', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_2', name: 'Beverages', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_3', name: 'Merchandise', created_at: "2023-01-01T10:00:00Z" },
    { id: 'cat_4', name: 'Room', created_at: "2023-01-01T10:00:00Z" },
];

const MOCK_PRODUCTS: Product[] = [
    { id: 'prod_1', name: 'Cheeseburger', price: 12.99, stock: 50, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_2', name: 'Fries', price: 4.50, stock: 100, category_id: 'cat_1', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_3', name: 'Cola', price: 2.50, stock: 200, category_id: 'cat_2', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_4', name: 'T-Shirt', price: 25.00, stock: 30, category_id: 'cat_3', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
    { id: 'prod_5', name: 'King Suite', price: 299.99, stock: 5, category_id: 'cat_4', image_url: 'https://placehold.co/300x200.png', created_at: "2023-01-01T10:00:00Z" },
];


export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [stockUpdateFile, setStockUpdateFile] = useState<File | null>(null);
  
  const { toast } = useToast();

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "N/A";
    return categories.find(c => c.id === categoryId)?.name || "N/A";
  };
  
  // Product Handlers
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.image_url);
    setIsProductDialogOpen(true);
  };
  
  const handleAddProduct = () => {
    setEditingProduct(EMPTY_PRODUCT);
    setImagePreview(EMPTY_PRODUCT.image_url!);
    setIsProductDialogOpen(true);
  }
  
  const handleDeleteProduct = async (productId: string) => {
    try {
      setProducts(products.filter(p => p.id !== productId));
      toast({ title: "Product Deleted", description: "The product has been removed from inventory." });
    } catch (error: any) {
      toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    }
  };
  
  const handleProductDialogClose = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
      setImagePreview(null);
    }
    setIsProductDialogOpen(open);
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleProductFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productData = {
        name: formData.get("name") as string,
        category_id: formData.get("category") as string,
        price: parseFloat(formData.get("price") as string),
        stock: parseInt(formData.get("stock") as string, 10),
    };

    const finalProductData = {
        ...productData,
        image_url: imagePreview || EMPTY_PRODUCT.image_url!,
    };

    try {
        if (editingProduct?.id) {
            setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...finalProductData } as Product : p));
            toast({ title: "Product Updated", description: `${finalProductData.name} has been updated.` });
        } else {
            const newProduct: Product = { 
                id: `prod_${new Date().getTime()}`,
                created_at: new Date().toISOString(),
                ...finalProductData
            };
            setProducts([newProduct, ...products]);
            toast({ title: "Product Added", description: `${newProduct.name} has been added to inventory.` });
        }
        handleProductDialogClose(false);
    } catch (error: any) {
         toast({ title: "Error", description: "Could not save product.", variant: "destructive" });
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
        setCategories(categories.filter((c) => c.id !== categoryId));
        toast({ title: "Category Deleted" });
    } catch(error: any) {
        toast({ title: "Error", description: "Could not delete category.", variant: "destructive" });
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
            setCategories(categories.map((c) => c.id === editingCategory.id ? ({ ...c, ...categoryData } as Category) : c));
            toast({ title: "Category Updated" });
        } else {
            const newCategory: Category = { 
                id: `cat_${new Date().getTime()}`,
                created_at: new Date().toISOString(),
                ...categoryData
            };
            setCategories([...categories, newCategory]);
            toast({ title: "Category Added" });
        }
        handleCategoryDialogClose(false);
    } catch (error: any) {
        toast({ title: "Error", description: "Could not save category.", variant: "destructive" });
    }
  };

  // Bulk Actions Handlers
  const handleImportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!importFile) {
        toast({ title: "No file selected", description: "Please select a CSV file to import.", variant: "destructive" });
        return;
    }

    Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            try {
                const newProducts: Product[] = [];
                let newCategories: Category[] = [...categories];

                results.data.forEach((row: any) => {
                    const { name, category_name, price, stock } = row;
                    if (!name || !category_name || !price || !stock) {
                        throw new Error("CSV is missing required columns: name, category_name, price, stock");
                    }

                    let category = newCategories.find(c => c.name.toLowerCase() === category_name.toLowerCase());
                    if (!category) {
                        const newCategory: Category = {
                            id: `cat_${new Date().getTime()}_${Math.random()}`,
                            name: category_name,
                            created_at: new Date().toISOString()
                        };
                        newCategories = [...newCategories, newCategory];
                        category = newCategory;
                    }
                    
                    const newProduct: Product = {
                        id: `prod_${new Date().getTime()}_${Math.random()}`,
                        name,
                        category_id: category.id,
                        price: parseFloat(price),
                        stock: parseInt(stock, 10),
                        image_url: "https://placehold.co/300x200.png",
                        created_at: new Date().toISOString()
                    };
                    newProducts.push(newProduct);
                });

                setProducts(prev => [...newProducts, ...prev]);
                setCategories(newCategories);
                toast({ title: "Import Successful", description: `${newProducts.length} products have been added.` });
                setIsImportDialogOpen(false);
                setImportFile(null);
            } catch (error: any) {
                toast({ title: "Import Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
            }
        },
        error: (error: any) => {
            toast({ title: "Import Error", description: error.message, variant: "destructive" });
        }
    });
  };

  const handleStockUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stockUpdateFile) {
        toast({ title: "No file selected", description: "Please select a CSV file to update stock.", variant: "destructive" });
        return;
    }

    Papa.parse(stockUpdateFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            try {
                let updatedCount = 0;
                const updatedProducts = products.map(product => {
                    const row: any = results.data.find((r: any) => r.name === product.name);
                    if (row) {
                        const { new_stock } = row;
                        if (new_stock !== undefined && !isNaN(parseInt(new_stock, 10))) {
                            updatedCount++;
                            return { ...product, stock: parseInt(new_stock, 10) };
                        }
                    }
                    return product;
                });
                
                setProducts(updatedProducts);
                toast({ title: "Stock Updated", description: `${updatedCount} products have been updated.` });
                setIsStockUpdateDialogOpen(false);
                setStockUpdateFile(null);

            } catch (error: any) {
                toast({ title: "Stock Update Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
            }
        },
        error: (error: any) => {
            toast({ title: "Stock Update Error", description: error.message, variant: "destructive" });
        }
    });
  };

  const handleExportInventory = () => {
    const reportData = products.map(p => ({
        "Product Name": p.name,
        "Category": getCategoryName(p.category_id),
        "Price": p.price.toFixed(2),
        "Stock": getCategoryName(p.category_id) === 'Room' ? 'N/A' : p.stock,
    }));
    
    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_report.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Started", description: "Your inventory report is downloading." });
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
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                  <Download className="mr-2 h-4 w-4" />
                                  Bulk Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Bulk Management</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => setIsImportDialogOpen(true)}>
                                  Import Products
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setIsStockUpdateDialogOpen(true)}>
                                  Update Stock
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleExportInventory}>
                                  Export Inventory Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                                    <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : products.length > 0 ? (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                        <TableCell className="hidden sm:table-cell">
                                            <Image
                                                src={product.image_url || 'https://placehold.co/80x80.png'}
                                                alt={product.name}
                                                width={40}
                                                height={40}
                                                className="rounded-md object-cover"
                                            />
                                        </TableCell>
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
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No products found.</TableCell></TableRow>
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
                    <Label htmlFor="image" className="text-right">Image</Label>
                    <div className="col-span-3 space-y-2">
                        {imagePreview && (
                            <Image
                                src={imagePreview}
                                alt="Product preview"
                                width={80}
                                height={80}
                                className="rounded-md object-cover"
                            />
                        )}
                        <Input
                            id="image"
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>
                </div>
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

       <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <form onSubmit={handleImportSubmit}>
                <DialogHeader>
                    <DialogTitle>Import Products from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: `name`, `category_name`, `price`, `stock`. The file must have a header row. New categories will be created automatically.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="import-file">CSV File</Label>
                    <Input id="import-file" type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={!importFile}>Import Products</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isStockUpdateDialogOpen} onOpenChange={setIsStockUpdateDialogOpen}>
        <DialogContent>
            <form onSubmit={handleStockUpdateSubmit}>
                <DialogHeader>
                    <DialogTitle>Bulk Update Stock from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: `name`, `new_stock`. This will update the stock for existing products based on their name.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="stock-update-file">CSV File</Label>
                    <Input id="stock-update-file" type="file" accept=".csv" onChange={(e) => setStockUpdateFile(e.target.files?.[0] || null)} />
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={!stockUpdateFile}>Update Stock</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
