
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { type Product, type Category, type StoreProduct, StoreType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";


const EMPTY_PRODUCT: Partial<Product> = {
  name: "",
  category_id: "",
  image_url: "https://placehold.co/300x200.png",
};

const EMPTY_CATEGORY: Partial<Category> = {
  name: "",
};

const EMPTY_STORE_PRODUCT: Partial<StoreProduct> = {
    price: 0,
    stock: 0,
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

  const [isStoreProductDialogOpen, setIsStoreProductDialogOpen] = useState(false);
  const [editingStoreProduct, setEditingStoreProduct] = useState<Partial<StoreProduct> & { product_id?: string } | null>(null);

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
      status: editingProduct.status || 'Available',
    };
    
    try {
      if ('id' in editingProduct && editingProduct.id) {
        await setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
        toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
      } else {
        const newProduct = { ...productData, id: `prod_${new Date().getTime()}`, created_at: new Date().toISOString(), store_products: [] };
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

  // Store Product Handlers
  const handleOpenStoreProductDialog = (storeProduct: Partial<StoreProduct> | null, productId: string) => {
    setEditingStoreProduct(storeProduct ? { ...storeProduct, product_id: productId } : { ...EMPTY_STORE_PRODUCT, product_id: productId });
    setIsStoreProductDialogOpen(true);
  };

  const handleStoreProductDialogClose = (open: boolean) => {
      if (!open) {
          setEditingStoreProduct(null);
      }
      setIsStoreProductDialogOpen(open);
  };

  const handleStoreProductFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStoreProduct || !editingStoreProduct.product_id) return;

    setIsProcessing(true);
    const formData = new FormData(event.currentTarget);
    const storeId = formData.get("store_id") as string;
    const price = parseFloat(formData.get("price") as string);
    const stock = parseInt(formData.get("stock") as string, 10);

    try {
        await setProducts(prevProducts => prevProducts.map(p => {
            if (p.id === editingStoreProduct.product_id) {
                const existingStoreProduct = p.store_products.find(sp => sp.store_id === storeId);
                let newStoreProducts: StoreProduct[];
                if (existingStoreProduct) {
                    newStoreProducts = p.store_products.map(sp => 
                        sp.id === existingStoreProduct.id ? { ...sp, price, stock } : sp
                    );
                } else {
                    const newStoreProduct: StoreProduct = {
                        id: `sp_${new Date().getTime()}`,
                        store_id: storeId,
                        product_id: p.id,
                        price,
                        stock,
                        businessId: loggedInUser?.businessId || '',
                    };
                    newStoreProducts = [...p.store_products, newStoreProduct];
                }
                return { ...p, store_products: newStoreProducts };
            }
            return p;
        }));
        toast({ title: "Store Inventory Updated" });
        handleStoreProductDialogClose(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
        <PageHeader
          title="Inventory Management"
          description="Manage your products, categories, and store-specific inventory."
        />

        <Tabs defaultValue="products">
            <TabsList className="mb-4">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="stores">Stores</TabsTrigger>
            </TabsList>

            <TabsContent value="products">
                <Card>
                    <CardHeader className="relative">
                        <CardTitle>Products</CardTitle>
                        <CardDescription>
                           A list of all products in your inventory. Assign products to stores from the Stores tab.
                        </CardDescription>
                         {canManageInventory && (
                            <div className="absolute top-6 right-6 flex items-center gap-2">
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

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Available In</TableHead>
                                    {canManageInventory && <TableHead><span className="sr-only">Actions</span></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={canManageInventory ? 5 : 4} className="h-24 text-center">Loading...</TableCell></TableRow>
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
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{getCategoryName(product.category_id)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {product.store_products?.length > 0 ? (
                                                        product.store_products.map(sp => (
                                                            <Badge key={sp.id} variant="secondary">
                                                                {stores.find(s => s.id === sp.store_id)?.name || 'Unknown Store'}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Not in any store</span>
                                                    )}
                                                </div>
                                            </TableCell>
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
                                    <TableRow><TableCell colSpan={canManageInventory ? 5 : 4} className="h-24 text-center">No products found for the current filters.</TableCell></TableRow>
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

            <TabsContent value="stores">
                <Card>
                    <CardHeader>
                        <CardTitle>Store Inventory</CardTitle>
                        <CardDescription>Manage product price and stock for each store.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {stores.map(store => (
                                <div key={store.id}>
                                    <h3 className="text-lg font-semibold mb-2">{store.name}</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Stock</TableHead>
                                                {canManageInventory && <TableHead><span className="sr-only">Actions</span></TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.filter(p => p.store_products?.some(sp => sp.store_id === store.id)).map(product => {
                                                const storeProduct = product.store_products.find(sp => sp.store_id === store.id)!;
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell>{product.name}</TableCell>
                                                        <TableCell>{currency}{storeProduct.price.toFixed(2)}</TableCell>
                                                        <TableCell>{storeProduct.stock}</TableCell>
                                                        {canManageInventory && (
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="icon" onClick={() => handleOpenStoreProductDialog(storeProduct, product.id)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                    {canManageInventory && (
                                        <Button className="mt-4" variant="outline" onClick={() => handleOpenStoreProductDialog(null, "new")}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Product to {store.name}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
      
      <Dialog open={isProductDialogOpen} onOpenChange={handleProductDialogClose}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleProductFormSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProduct && 'id' in editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                <DialogDescription>
                  {editingProduct && 'id' in editingProduct ? 'Update the details of this product.' : 'Fill in the details to add a new product.'}
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
                            {visibleCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
      
      <Dialog open={isStoreProductDialogOpen} onOpenChange={handleStoreProductDialogClose}>
        <DialogContent>
            <form onSubmit={handleStoreProductFormSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingStoreProduct?.id ? 'Edit Store Inventory' : 'Add Product to Store'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 grid gap-4">
                    {editingStoreProduct?.product_id === 'new' && (
                         <div className="space-y-2">
                            <Label htmlFor="product_id">Product</Label>
                            <Select name="product_id" required>
                                <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="store_id">Store</Label>
                        <Select name="store_id" required defaultValue={editingStoreProduct?.store_id}>
                            <SelectTrigger><SelectValue placeholder="Select a store" /></SelectTrigger>
                            <SelectContent>
                                {stores.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Price ({currency})</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={editingStoreProduct?.price} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="stock">Stock</Label>
                        <Input id="stock" name="stock" type="number" step="1" defaultValue={editingStoreProduct?.stock} required />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" disabled={isProcessing}>
                         {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
