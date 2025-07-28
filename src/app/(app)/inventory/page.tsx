
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
import { MoreHorizontal, PlusCircle, Trash2, Edit, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Product, type Category } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
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

export default function InventoryPage() {
  const { 
    products, setProducts, 
    categories, setCategories, 
    currency,
    featureSettings
  } = useSettings();
  const [loading, setLoading] = useState(true);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const isReservationsEnabled = featureSettings.reservations;

  const [editingCell, setEditingCell] = useState<{ productId: string; field: keyof Product } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "N/A";
    return categories.find(c => c.id === categoryId)?.name || "N/A";
  };

  const visibleCategories = useMemo(() => {
    if (isReservationsEnabled) return categories;
    return categories.filter(c => c.name.toLowerCase() !== 'room');
  }, [categories, isReservationsEnabled]);

  const visibleProducts = useMemo(() => {
    if (isReservationsEnabled) return products;
    return products.filter(p => getCategoryName(p.category_id)?.toLowerCase() !== 'room');
  }, [products, categories, isReservationsEnabled, getCategoryName]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleInlineEditClick = (product: Product, field: keyof Product) => {
    setEditingCell({ productId: product.id, field });
    setEditingValue(product[field] as string | number);
  };
  
  const handleInlineEditSave = () => {
    if (!editingCell) return;

    setProducts(prevProducts =>
      prevProducts.map(p => {
        if (p.id === editingCell.productId) {
          const updatedProduct = { ...p, [editingCell.field]: editingValue };
          toast({ title: `Product updated`, description: `Set ${editingCell.field} to ${editingValue}.` });
          return updatedProduct;
        }
        return p;
      })
    );
    setEditingCell(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      handleInlineEditSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    const formData = new FormData(event.currentTarget);
    const productData = {
      name: formData.get("name") as string,
      category_id: formData.get("category") as string,
      price: parseFloat(formData.get("price") as string),
      stock: parseInt(formData.get("stock") as string, 10),
      image_url: imagePreview || EMPTY_PRODUCT.image_url!,
      status: editingProduct.status || 'Available',
    };
    
    try {
      if ('id' in editingProduct && editingProduct.id) {
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
        toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
      } else {
        const newProduct = { ...productData, id: `prod_${new Date().getTime()}`, created_at: new Date().toISOString() };
        setProducts([newProduct, ...products]);
        toast({ title: "Product Added", description: `${productData.name} has been added to inventory.` });
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
      setCategories(categories.filter((c) => c.id !== categoryId));
      toast({ title: "Category Deleted" });
    } catch (error: any) {
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
    if (!editingCategory) return;
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
      return;
    }

    const categoryData = {
      name: categoryName,
    };

    try {
      if ('id' in editingCategory && editingCategory.id) {
        setCategories(categories.map((c) => c.id === editingCategory.id ? ({ ...c, ...categoryData } as Category) : c));
        toast({ title: "Category Updated" });
      } else {
        const newCategory = { ...categoryData, id: `cat_${new Date().getTime()}`, created_at: new Date().toISOString() };
        setCategories([...categories, newCategory]);
        toast({ title: "Category Added" });
      }
      handleCategoryDialogClose(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Import/Export Handlers
  const handleExportProducts = () => {
    const dataToExport = visibleProducts.map(p => ({
      name: p.name,
      category_name: getCategoryName(p.category_id),
      price: p.price,
      stock: p.stock
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Product list has been downloaded." });
  };

  const handleDownloadTemplate = () => {
    const templateData = [{ name: "Sample Burger", category_name: "Food", price: 10.99, stock: 50 }];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedData = results.data as any[];
        let newProducts: Product[] = [];
        let errors = 0;

        importedData.forEach((row, index) => {
          const { name, category_name, price, stock } = row;
          const category = categories.find(c => c.name.toLowerCase() === category_name?.toLowerCase());

          if (!name || !category || isNaN(parseFloat(price)) || isNaN(parseInt(stock))) {
            errors++;
            console.warn(`Skipping invalid row ${index + 1}:`, row);
            return;
          }

          newProducts.push({
            id: `prod_${new Date().getTime()}_${index}`,
            name,
            category_id: category.id,
            price: parseFloat(price),
            stock: parseInt(stock),
            image_url: "https://placehold.co/300x200.png",
            created_at: new Date().toISOString(),
            status: 'Available',
          });
        });

        setProducts(prev => [...prev, ...newProducts]);
        toast({
          title: "Import Complete",
          description: `${newProducts.length} products imported successfully. ${errors > 0 ? `${errors} rows failed.` : ''}`,
        });
        setIsImportDialogOpen(false);
      },
      error: (error) => {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  const renderCell = (product: Product, field: keyof Product) => {
    if (editingCell?.productId === product.id && editingCell.field === field) {
      if (field === 'category_id') {
        return (
          <Select
            value={editingValue as string}
            onValueChange={(value) => setEditingValue(value)}
            onOpenChange={(isOpen) => !isOpen && handleInlineEditSave()}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          autoFocus
          value={editingValue}
          onChange={(e) => setEditingValue(field === 'name' ? e.target.value : Number(e.target.value))}
          onBlur={handleInlineEditSave}
          onKeyDown={handleKeyDown}
          type={field === 'name' ? 'text' : 'number'}
          className="h-8"
        />
      );
    }

    let displayValue: React.ReactNode;
    switch (field) {
        case 'category_id':
            displayValue = getCategoryName(product.category_id);
            break;
        case 'price':
            displayValue = `${currency}${product.price.toFixed(2)}`;
            break;
        case 'stock':
            displayValue = getCategoryName(product.category_id) === 'Room' ? 'N/A' : product.stock;
            break;
        default:
            displayValue = product[field];
    }
    
    return (
      <div onClick={() => handleInlineEditClick(product, field)} className="cursor-pointer min-h-[2rem] flex items-center">
        {displayValue}
      </div>
    );
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
                            A list of all products in your inventory. Click on a cell to edit.
                        </CardDescription>
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                              <Upload className="mr-2 h-4 w-4" /> Import
                            </Button>
                            <Button variant="outline" onClick={handleExportProducts}>
                               <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
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
                                ) : visibleProducts.length > 0 ? (
                                    visibleProducts.map((product) => (
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
                                            <TableCell className="font-medium">{renderCell(product, 'name')}</TableCell>
                                            <TableCell>{renderCell(product, 'category_id')}</TableCell>
                                            <TableCell className="text-right">{renderCell(product, 'price')}</TableCell>
                                            <TableCell className="text-right">{renderCell(product, 'stock')}</TableCell>
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
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Full Details
                                                        </DropdownMenuItem>
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
                                ) : visibleCategories.length > 0 ? (
                                    visibleCategories.map((category) => (
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">Price ({currency})</Label>
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
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple products at once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm">
              Your CSV file should have the following columns: `name`, `category_name`, `price`, `stock`. The `category_name` must match an existing category in your system.
            </p>
            <Button variant="link" onClick={handleDownloadTemplate} className="p-0 h-auto">
              Download Template
            </Button>
            <Input
              id="import-file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleImportProducts}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
