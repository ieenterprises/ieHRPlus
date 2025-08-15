
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Upload, Download, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Product, type Category, type StoreProduct } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";


const EMPTY_PRODUCT: Partial<Product> = {
  name: "",
  category_id: "",
  image_url: "https://placehold.co/300x200.png",
  store_products: [],
};

const EMPTY_CATEGORY: Partial<Category> = {
  name: "",
};

export default function InventoryPage() {
  const { 
    products, setProducts, 
    categories, setCategories, 
    currency,
    featureSettings,
    loggedInUser,
    stores,
  } = useSettings();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const isReservationsEnabled = featureSettings.reservations;
  
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const canManageInventory = useMemo(() => loggedInUser?.permissions.includes('MANAGE_ITEMS_BO') ?? false, [loggedInUser]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "N/A";
    return categories.find(c => c.id === categoryId)?.name || "N/A";
  };

  const visibleCategories = useMemo(() => {
    if (isReservationsEnabled) return categories;
    return categories.filter(c => c.name.toLowerCase() !== 'room');
  }, [categories, isReservationsEnabled]);

  const filteredProducts = useMemo(() => {
    let prods = products;
    
    if (categoryFilter !== "all") {
        prods = prods.filter(p => p.category_id === categoryFilter);
    }

    if (searchTerm) {
        prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return prods;
  }, [products, categoryFilter, searchTerm]);

  useEffect(() => {
    setLoading(false);
  }, []);

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
    setIsProcessing(true);
    try {
      await setProducts(products.filter(p => p.id !== productId));
      toast({ title: "Product Deleted", description: "The product has been removed from inventory." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
    if (!editingProduct) return;
    setIsProcessing(true);
    const formData = new FormData(event.currentTarget);
    const productData = {
      name: formData.get("name") as string,
      category_id: formData.get("category") as string,
      image_url: imagePreview || EMPTY_PRODUCT.image_url!,
    };

    const newStoreProducts: StoreProduct[] = stores.map(store => {
      const price = parseFloat(formData.get(`price-${store.id}`) as string);
      const stock = parseInt(formData.get(`stock-${store.id}`) as string, 10);
      const existingStoreProduct = editingProduct.store_products?.find(sp => sp.store_id === store.id);

      return {
        id: existingStoreProduct?.id || `sp_${store.id}_${new Date().getTime()}`,
        product_id: editingProduct.id || '', // Will be set for new products later
        store_id: store.id,
        price: isNaN(price) ? (existingStoreProduct?.price || 0) : price,
        stock: isNaN(stock) ? (existingStoreProduct?.stock || 0) : stock,
        businessId: loggedInUser?.businessId || '',
      };
    }).filter(sp => sp.price > 0 || sp.stock > 0);
    
    try {
      if ('id' in editingProduct && editingProduct.id) {
        await setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData, store_products: newStoreProducts.map(sp => ({...sp, product_id: p.id})) } as Product : p));
        toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
      } else {
        const newProductId = `prod_${new Date().getTime()}`;
        const newProduct = { 
            ...productData, 
            id: newProductId, 
            created_at: new Date().toISOString(),
            store_products: newStoreProducts.map(sp => ({ ...sp, product_id: newProductId }))
        };
        await setProducts([newProduct as Product, ...products]);
        toast({ title: "Product Added", description: `${productData.name} has been added to inventory.` });
      }
      handleProductDialogClose(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
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
    setIsProcessing(true);
    try {
      await setCategories(categories.filter((c) => c.id !== categoryId));
      toast({ title: "Category Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
    if (!editingCategory) return;
    
    setIsProcessing(true);
    const formData = new FormData(event.currentTarget);
    const categoryName = formData.get("name") as string;

    if (
      !isReservationsEnabled &&
      (categoryName.toLowerCase() === 'room' || categoryName.toLowerCase() === 'rooms')
    ) {
      toast({
        title: "Feature Disabled",
        description: "Cannot create 'Room' category while Reservations feature is disabled.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const categoryData = {
      name: categoryName,
    };

    try {
      if ('id' in editingCategory && editingCategory.id) {
        await setCategories(categories.map((c) => c.id === editingCategory.id ? ({ ...c, ...categoryData } as Category) : c));
        toast({ title: "Category Updated" });
      } else {
        const newCategory = { ...categoryData, id: `cat_${new Date().getTime()}`, created_at: new Date().toISOString() };
        await setCategories([...categories, newCategory as Category]);
        toast({ title: "Category Added" });
      }
      handleCategoryDialogClose(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  // Import/Export Handlers
  const handleExport = () => {
    const dataToExport = products.map(p => {
        const row: any = {
            ID: p.id,
            Name: p.name,
            Category: getCategoryName(p.category_id),
            ImageURL: p.image_url,
        };
        stores.forEach(store => {
            const sp = p.store_products.find(sp => sp.store_id === store.id);
            row[`${store.name} Price`] = sp?.price || 0;
            row[`${store.name} Stock`] = sp?.stock || 0;
        });
        return row;
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete" });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            try {
                const importedProducts = results.data as any[];
                
                const updatedProducts: Product[] = [...products];

                for (const row of importedProducts) {
                    const category = categories.find(c => c.name === row.Category);
                    if (!category) {
                        console.warn(`Skipping product "${row.Name}": Category "${row.Category}" not found.`);
                        continue;
                    }

                    const store_products: StoreProduct[] = stores.map(store => ({
                        id: `sp_imp_${store.id}_${row.ID || new Date().getTime()}`,
                        store_id: store.id,
                        product_id: row.ID || '',
                        price: parseFloat(row[`${store.name} Price`]) || 0,
                        stock: parseInt(row[`${store.name} Stock`], 10) || 0,
                        businessId: loggedInUser?.businessId || '',
                    }));

                    const existingProductIndex = updatedProducts.findIndex(p => p.id === row.ID);

                    if (existingProductIndex > -1) {
                        // Update existing product
                        updatedProducts[existingProductIndex] = {
                            ...updatedProducts[existingProductIndex],
                            name: row.Name,
                            category_id: category.id,
                            image_url: row.ImageURL || updatedProducts[existingProductIndex].image_url,
                            store_products: store_products.map(sp => ({...sp, product_id: row.ID})),
                        };
                    } else {
                        // Add new product
                        const newId = `prod_imp_${new Date().getTime()}_${Math.random()}`;
                        updatedProducts.push({
                            id: newId,
                            name: row.Name,
                            category_id: category.id,
                            image_url: row.ImageURL || EMPTY_PRODUCT.image_url!,
                            created_at: new Date().toISOString(),
                            status: 'Available',
                            store_products: store_products.map(sp => ({...sp, product_id: newId})),
                            businessId: loggedInUser?.businessId || '',
                        });
                    }
                }

                await setProducts(updatedProducts);
                toast({ title: "Import Successful", description: `${importedProducts.length} products processed.` });
            } catch (error: any) {
                toast({ title: "Import Error", description: error.message, variant: "destructive" });
            } finally {
                setIsProcessing(false);
                setIsImportDialogOpen(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        },
        error: (error: any) => {
            toast({ title: "Import Error", description: error.message, variant: "destructive" });
            setIsProcessing(false);
        }
    });
  };
  
  const handleDownloadTemplate = () => {
    const headers = ["ID", "Name", "Category", "ImageURL"];
    stores.forEach(store => {
      headers.push(`${store.name} Price`, `${store.name} Stock`);
    });
    
    const exampleCategory = categories[0]?.name || "Sample Category";

    const exampleRow: any = {
      ID: "prod_example_123",
      Name: "Sample Product",
      Category: exampleCategory,
      ImageURL: "https://placehold.co/300x200.png",
    };
    stores.forEach(store => {
      exampleRow[`${store.name} Price`] = "10.99";
      exampleRow[`${store.name} Stock`] = "100";
    });

    const csv = Papa.unparse({
      fields: headers,
      data: [Object.values(exampleRow)],
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded" });
  };

  return (
    <div className="space-y-8">
        <PageHeader
          title="Inventory Management"
          description="Manage your products and categories across all stores."
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
                         {canManageInventory && (
                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                                    <Upload className="mr-2 h-4 w-4" /> Import
                                </Button>
                                <Button variant="outline" onClick={handleExport}>
                                    <Download className="mr-2 h-4 w-4" /> Export
                                </Button>
                                <Button onClick={handleAddProduct}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Product
                                </Button>
                            </div>
                         )}
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center mb-4 gap-4">
                            <div className="flex items-center gap-2">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {visibleCategories.map((category) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                            </div>
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search products by name..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        {stores.map(store => (
                                            <React.Fragment key={store.id}>
                                                <TableHead>{store.name} Price</TableHead>
                                                <TableHead>{store.name} Stock</TableHead>
                                            </React.Fragment>
                                        ))}
                                        {canManageInventory && <TableHead><span className="sr-only">Actions</span></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={canManageInventory ? 4 + stores.length * 2 : 3 + stores.length * 2} className="h-24 text-center">Loading...</TableCell></TableRow>
                                    ) : filteredProducts.length > 0 ? (
                                        filteredProducts.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="hidden sm:table-cell">
                                                    <Image
                                                        src={product.image_url || 'https://placehold.co/80x80.png'}
                                                        alt={product.name}
                                                        width={40}
                                                        height={40}
                                                        className="rounded-md object-cover"
                                                        data-ai-hint="product image"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell>{getCategoryName(product.category_id)}</TableCell>
                                                {stores.map(store => {
                                                    const storeProduct = product.store_products?.find(sp => sp.store_id === store.id);
                                                    return (
                                                        <React.Fragment key={store.id}>
                                                            <TableCell>{currency}{storeProduct?.price?.toFixed(2) || '0.00'}</TableCell>
                                                            <TableCell>{storeProduct?.stock || 0}</TableCell>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                 {canManageInventory && (
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
                                                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                 )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={canManageInventory ? 4 + stores.length * 2 : 3 + stores.length * 2} className="h-24 text-center">No products found for the current filters.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
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
                         {canManageInventory && (
                             <div className="absolute top-6 right-6">
                                <Button onClick={handleAddCategory}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Category
                                </Button>
                            </div>
                         )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    {canManageInventory && <TableHead className="w-[120px] text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {loading ? (
                                     <TableRow><TableCell colSpan={canManageInventory ? 2 : 1} className="h-24 text-center">Loading...</TableCell></TableRow>
                                ) : visibleCategories.length > 0 ? (
                                    visibleCategories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            {canManageInventory && (
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={canManageInventory ? 2 : 1} className="text-center text-muted-foreground h-24">
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
          <DialogContent className="sm:max-w-3xl">
            <form onSubmit={handleProductFormSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProduct && 'id' in editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct && 'id' in editingProduct ? 'Update the details of this product.' : 'Fill in the details to add a new product.'}
                </DialogDescription>
              </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="image">Image</Label>
                            <div className="flex items-center gap-4">
                                {imagePreview && (
                                    <Image
                                        src={imagePreview}
                                        alt="Product preview"
                                        width={80}
                                        height={80}
                                        className="rounded-md object-cover"
                                        data-ai-hint="product image"
                                    />
                                )}
                                <Input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" required defaultValue={editingProduct?.category_id ?? ""}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Store Inventory</h3>
                        <ScrollArea className="h-64 border rounded-md p-4">
                            <div className="space-y-4">
                                {stores.map(store => {
                                    const storeProduct = editingProduct?.store_products?.find(sp => sp.store_id === store.id);
                                    return (
                                        <div key={store.id} className="space-y-2 p-2 bg-muted/50 rounded-md">
                                            <Label className="font-semibold">{store.name}</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label htmlFor={`price-${store.id}`} className="text-xs">Price ({currency})</Label>
                                                    <Input id={`price-${store.id}`} name={`price-${store.id}`} type="number" step="0.01" defaultValue={storeProduct?.price || ''} placeholder="0.00" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor={`stock-${store.id}`} className="text-xs">Stock</Label>
                                                    <Input id={`stock-${store.id}`} name={`stock-${store.id}`} type="number" step="1" defaultValue={storeProduct?.stock || ''} placeholder="0" />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isCategoryDialogOpen} onOpenChange={handleCategoryDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCategoryFormSubmit}>
              <DialogHeader>
                <DialogTitle>{editingCategory && 'id' in editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory && 'id' in editingCategory ? 'Update the category name.' : 'Enter the name for the new category.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" defaultValue={editingCategory?.name} className="col-span-3" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import Products</DialogTitle>
                <DialogDescription>
                    Upload a CSV file to bulk add or update products. Make sure your CSV has columns: `ID`, `Name`, `Category`, `ImageURL`, and then `Store Name Price` and `Store Name Stock` for each store.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} disabled={isProcessing} className="flex-1" />
                    <Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/> Template</Button>
                </div>
                {isProcessing && <p className="text-sm text-muted-foreground mt-2 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing file...</p>}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
