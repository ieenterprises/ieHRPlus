
"use client";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, ListFilter, Search, ArrowRight, Calculator, Check, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { useState, useEffect, useMemo, useRef } from "react";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import type { Sale, Product, Category, User, StoreType, PosDeviceType, PaymentType } from "@/lib/types";
import Papa from "papaparse";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog } from "@/components/ui/dialog";


type ReportDataPoint = {
    name: string;
    category?: string;
    sales: number;
    tax: number;
    netPayment: number;
    quantity: number;
    transactions: number;
    paymentSales: { [key: string]: number };
    paymentQuantities: { [key: string]: number };
};

type TransactionDataPoint = {
  id: string;
  orderNumber: number;
  date: string;
  employee: string;
  customer: string;
  items: string;
  categories: string;
  total: number;
  paymentMethods: string[];
}

type VisibleColumns = {
  [key: string]: boolean;
};

type InventoryCalculatorItem = {
    productId: string;
    name: string;
    originalStock: number;
    sold: number | null;
    addedStock: number | null;
    remaining: number | null;
};

function ReportChart({ data, title, currency }: { data: ReportDataPoint[], title: string, currency: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value}`} />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))" }}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
            />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ReportTable({ data, dataKeyLabel, currency, visibleColumns, paymentTypes, onCopySoldItems, isInventorySort }: { data: ReportDataPoint[], dataKeyLabel: string, currency: string, visibleColumns: VisibleColumns, paymentTypes: PaymentType[], onCopySoldItems: () => void, isInventorySort: boolean }) {
    const totalSales = useMemo(() => data.reduce((acc, item) => acc + item.sales, 0), [data]);
    const totalTax = useMemo(() => data.reduce((acc, item) => acc + item.tax, 0), [data]);
    const totalNetPayment = useMemo(() => data.reduce((acc, item) => acc + item.netPayment, 0), [data]);
    const totalQuantity = useMemo(() => data.reduce((acc, item) => acc + (item.quantity || 0), 0), [data]);
    const totalTransactions = useMemo(() => data.reduce((acc, item) => acc + item.transactions, 0), [data]);

    const paymentTypeTotals = useMemo(() => {
        const totals: { [key: string]: number } = {};
        paymentTypes.forEach(pt => {
            totals[pt.name] = data.reduce((acc, item) => acc + (item.paymentSales[pt.name] || 0), 0);
        });
        return totals;
    }, [data, paymentTypes]);

    const paymentQuantityTotals = useMemo(() => {
        const totals: { [key: string]: number } = {};
        paymentTypes.forEach(pt => {
            totals[pt.name] = data.reduce((acc, item) => acc + (item.paymentQuantities[pt.name] || 0), 0);
        });
        return totals;
    }, [data, paymentTypes]);
    
    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle>Detailed Report</CardTitle>
                </div>
                 {isInventorySort && (
                    <Button onClick={onCopySoldItems}>
                        <ArrowRight className="mr-2 h-4 w-4" /> Copy Sold Items to Calculator
                    </Button>
                 )}
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{dataKeyLabel}</TableHead>
                                {dataKeyLabel === 'Item' && visibleColumns.category && <TableHead>Category</TableHead>}
                                {visibleColumns.netSales && <TableHead className="text-right">Net Sales</TableHead>}
                                {visibleColumns.tax && <TableHead className="text-right">Tax</TableHead>}
                                {visibleColumns.netPayment && <TableHead className="text-right">Net Payment</TableHead>}
                                {visibleColumns.itemsSold && <TableHead className="text-right">Items Sold</TableHead>}
                                {visibleColumns.transactions && <TableHead className="text-right">Transactions</TableHead>}
                                {paymentTypes.map(pt => visibleColumns[`${pt.name} Sales`] && (
                                  <TableHead key={`${pt.id}-sales`} className="text-right">{pt.name} Sales</TableHead>
                                ))}
                                {paymentTypes.map(pt => visibleColumns[`Items Sold (${pt.name})`] && (
                                    <TableHead key={`${pt.id}-items`} className="text-right">Items Sold ({pt.name})</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    {dataKeyLabel === 'Item' && visibleColumns.category && <TableCell>{item.category}</TableCell>}
                                    {visibleColumns.netSales && <TableCell className="text-right">{currency}{item.sales.toFixed(2)}</TableCell>}
                                    {visibleColumns.tax && <TableCell className="text-right">{currency}{item.tax.toFixed(2)}</TableCell>}
                                    {visibleColumns.netPayment && <TableCell className="text-right">{currency}{item.netPayment.toFixed(2)}</TableCell>}
                                    {visibleColumns.itemsSold && <TableCell className="text-right">{item.quantity}</TableCell>}
                                    {visibleColumns.transactions && <TableCell className="text-right">{item.transactions}</TableCell>}
                                    {paymentTypes.map(pt => visibleColumns[`${pt.name} Sales`] && (
                                      <TableCell key={`${pt.id}-sales-val`} className="text-right">{currency}{(item.paymentSales[pt.name] || 0).toFixed(2)}</TableCell>
                                    ))}
                                    {paymentTypes.map(pt => visibleColumns[`Items Sold (${pt.name})`] && (
                                        <TableCell key={`${pt.id}-items-val`} className="text-right">{item.paymentQuantities[pt.name] || 0}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-bold">
                                <TableCell>Total</TableCell>
                                {dataKeyLabel === 'Item' && visibleColumns.category && <TableCell></TableCell>}
                                {visibleColumns.netSales && <TableCell className="text-right">{currency}{totalSales.toFixed(2)}</TableCell>}
                                {visibleColumns.tax && <TableCell className="text-right">{currency}{totalTax.toFixed(2)}</TableCell>}
                                {visibleColumns.netPayment && <TableCell className="text-right">{currency}{totalNetPayment.toFixed(2)}</TableCell>}
                                {visibleColumns.itemsSold && <TableCell className="text-right">{totalQuantity}</TableCell>}
                                {visibleColumns.transactions && <TableCell className="text-right">{totalTransactions}</TableCell>}
                                {paymentTypes.map(pt => visibleColumns[`${pt.name} Sales`] && (
                                  <TableCell key={`${pt.id}-sales-total`} className="text-right">{currency}{paymentTypeTotals[pt.name].toFixed(2)}</TableCell>
                                ))}
                                {paymentTypes.map(pt => visibleColumns[`Items Sold (${pt.name})`] && (
                                    <TableCell key={`${pt.id}-items-total`} className="text-right">{paymentQuantityTotals[pt.name]}</TableCell>
                                ))}
                            </TableRow>
                        </TableFooter>
                    </Table>
                 </div>
            </CardContent>
        </Card>
    )
}

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const { stores, posDevices, paymentTypes, users, currency, sales, products, setProducts, categories, taxes: allTaxes } = useSettings();

  const [filters, setFilters] = useState({
      storeId: 'all',
      deviceId: 'all',
      employeeId: 'all',
      paymentTypeId: 'all',
      searchTerm: '',
      itemSortOrder: 'top-sellers',
  });

  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    netSales: true,
    tax: true,
    netPayment: true,
    itemsSold: true,
    transactions: true,
    category: true,
  });

  const [activeTab, setActiveTab] = useState("item");
  const [salesByItem, setSalesByItem] = useState<ReportDataPoint[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<ReportDataPoint[]>([]);
  const [salesByEmployee, setSalesByEmployee] = useState<ReportDataPoint[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<ReportDataPoint[]>([]);
  const [salesByTransaction, setSalesByTransaction] = useState<TransactionDataPoint[]>([]);
  
  // Inventory Calculator State
  const [inventoryCalcData, setInventoryCalcData] = useState<InventoryCalculatorItem[]>([]);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ productId: string; field: 'addedStock' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const availableDevices = useMemo(() => {
    if (filters.storeId === 'all') return posDevices;
    return posDevices.filter(d => d.store_id === filters.storeId);
  }, [filters.storeId, posDevices]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, deviceId: 'all' }));
  }, [filters.storeId]);

  useEffect(() => {
    const initialVisibility: VisibleColumns = {
        netSales: true, tax: true, netPayment: true, itemsSold: true, transactions: true, category: true,
    };
    paymentTypes.forEach(pt => {
        const isDefaultVisible = ['Cash', 'Card', 'Credit'].includes(pt.name);
        initialVisibility[`${pt.name} Sales`] = isDefaultVisible;
        initialVisibility[`Items Sold (${pt.name})`] = false;
    });
    setVisibleColumns(initialVisibility);
  }, [paymentTypes]);


  useEffect(() => {
      setLoading(true);
      if (!date?.from) return;

      const fromDate = startOfDay(date.from);
      const toDate = date.to ? endOfDay(date.to) : endOfDay(new Date());
      const defaultTax = allTaxes.find(t => t.is_default);

      let filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at!);
          let match = saleDate >= fromDate && saleDate <= toDate;
          if (filters.employeeId !== 'all') match &&= sale.employee_id === filters.employeeId;
          if (filters.deviceId !== 'all') {
              match &&= sale.pos_device_id === filters.deviceId;
          } else if (filters.storeId !== 'all') {
              const device = posDevices.find(d => d.id === sale.pos_device_id);
              match &&= device?.store_id === filters.storeId;
          }
          if (filters.paymentTypeId !== 'all') {
            const paymentType = paymentTypes.find(p => p.id === filters.paymentTypeId);
            if (paymentType) match &&= sale.payment_methods.includes(paymentType.name);
          }
          return match;
      });

      const transactionData = filteredSales.map(sale => {
        const itemNames = (sale.items as any[]).map(i => `${i.name} (x${i.quantity})`).join(', ');
        const categoryNames = [...new Set((sale.items as any[]).map(i => {
            const product = products.find(p => p.id === i.id);
            return product ? categories.find(c => c.id === product.category_id)?.name : 'N/A';
        }).filter(Boolean))].join(', ');

        return {
          id: sale.id,
          orderNumber: sale.order_number,
          date: format(new Date(sale.created_at!), 'PPpp'),
          employee: users.find(u => u.id === sale.employee_id)?.name || 'N/A',
          customer: sale.customers?.name || 'Walk-in',
          items: itemNames,
          categories: categoryNames,
          total: sale.total,
          paymentMethods: sale.payment_methods as string[],
        }
      });
      setSalesByTransaction(transactionData);
      
      const getProratedData = (netSaleAmount: number, quantity: number, paymentMethods: string[]) => {
          const payments: { [key: string]: number } = {};
          const quantities: { [key: string]: number } = {};
          paymentTypes.forEach(pt => {
            payments[pt.name] = 0;
            quantities[pt.name] = 0;
          });
          
          const nonCreditMethods = paymentMethods.filter(pm => paymentTypes.find(p => p.name === pm && p.type !== 'Credit'));
          const creditMethod = paymentMethods.find(pm => paymentTypes.find(p => p.name === pm && p.type === 'Credit'));

          if (creditMethod) {
              payments[creditMethod] = netSaleAmount;
              quantities[creditMethod] = quantity;
          } else if (nonCreditMethods.length > 0) {
              const splitAmount = netSaleAmount / nonCreditMethods.length;
              const splitQuantity = quantity / nonCreditMethods.length; // Can be fractional
              nonCreditMethods.forEach(method => {
                  payments[method] += splitAmount;
                  quantities[method] += splitQuantity;
              });
          }
          return { payments, quantities };
      }

      const getTaxAmount = (netAmount: number) => defaultTax ? netAmount * (defaultTax.rate / 100) : 0;

      const createInitialDataPoint = (name: string): ReportDataPoint => {
        const initialPayments: { [key: string]: number } = {};
        const initialQuantities: { [key: string]: number } = {};
        paymentTypes.forEach(pt => {
            initialPayments[pt.name] = 0;
            initialQuantities[pt.name] = 0;
        });
        return { name, sales: 0, tax: 0, netPayment: 0, quantity: 0, transactions: 0, paymentSales: initialPayments, paymentQuantities: initialQuantities };
      };

      const itemSales = filteredSales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
            const product = products.find(p => p.id === item.id);
            const netAmount = item.price * item.quantity;
            const taxAmount = getTaxAmount(netAmount);
            const { payments, quantities } = getProratedData(netAmount, item.quantity, sale.payment_methods);
            
            acc[item.name] = acc[item.name] || createInitialDataPoint(item.name);
            acc[item.name].category = categories.find(c => c.id === product?.category_id)?.name || 'N/A';
            acc[item.name].sales += netAmount;
            acc[item.name].tax += taxAmount;
            acc[item.name].netPayment += netAmount + taxAmount;
            acc[item.name].quantity! += item.quantity;
            acc[item.name].transactions += 1; // Imperfect, counts transaction per item
            paymentTypes.forEach(pt => {
                acc[item.name].paymentSales[pt.name] += payments[pt.name] || 0;
                acc[item.name].paymentQuantities[pt.name] += quantities[pt.name] || 0;
            });
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      
      let itemSalesArray = Object.values(itemSales);
      if (filters.itemSortOrder === 'inventory') {
          const productOrder = products.map(p => p.name);
          itemSalesArray.sort((a, b) => {
              const indexA = productOrder.indexOf(a.name);
              const indexB = productOrder.indexOf(b.name);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
          });
      } else {
          itemSalesArray.sort((a, b) => b.sales - a.sales);
      }
      setSalesByItem(itemSalesArray);
      
      const categorySales = filteredSales.reduce((acc, sale) => {
        (sale.items as any[]).forEach(item => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = categories.find(c => c.id === product.category_id);
            if (category) {
              const netAmount = item.price * item.quantity;
              const taxAmount = getTaxAmount(netAmount);
              const { payments, quantities } = getProratedData(netAmount, item.quantity, sale.payment_methods);

              acc[category.name] = acc[category.name] || createInitialDataPoint(category.name);
              acc[category.name].sales += netAmount;
              acc[category.name].tax += taxAmount;
              acc[category.name].netPayment += netAmount + taxAmount;
              acc[category.name].quantity! += item.quantity;
              acc[category.name].transactions++;
              paymentTypes.forEach(pt => {
                  acc[category.name].paymentSales[pt.name] += payments[pt.name] || 0;
                  acc[category.name].paymentQuantities[pt.name] += quantities[pt.name] || 0;
              });
            }
          }
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByCategory(Object.values(categorySales).sort((a, b) => b.sales - a.sales));

      const employeeSales = filteredSales.reduce((acc, sale) => {
        const employeeName = users.find(u => u.id === sale.employee_id)?.name || 'N/A';
        const netAmount = sale.total / (1 + ((defaultTax?.rate || 0) / 100));
        const taxAmount = sale.total - netAmount;
        const totalQuantity = (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
        const { payments, quantities } = getProratedData(netAmount, totalQuantity, sale.payment_methods);

        acc[employeeName] = acc[employeeName] || createInitialDataPoint(employeeName);
        acc[employeeName].sales += netAmount;
        acc[employeeName].tax += taxAmount;
        acc[employeeName].netPayment += sale.total;
        acc[employeeName].quantity! += totalQuantity;
        acc[employeeName].transactions++;
        paymentTypes.forEach(pt => {
            acc[employeeName].paymentSales[pt.name] += payments[pt.name] || 0;
            acc[employeeName].paymentQuantities[pt.name] += quantities[pt.name] || 0;
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByEmployee(Object.values(employeeSales).sort((a, b) => b.sales - a.sales));

      const paymentSales = filteredSales.reduce((acc, sale) => {
        const netAmount = sale.total / (1 + ((defaultTax?.rate || 0) / 100));
        const taxAmount = sale.total - netAmount;
        const totalQuantity = (sale.items as any[]).reduce((sum, i) => sum + i.quantity, 0);
        (sale.payment_methods as any[]).forEach(method => {
            acc[method] = acc[method] || createInitialDataPoint(method);
            acc[method].sales += netAmount; // Imperfect for split payments
            acc[method].tax += taxAmount;
            acc[method].netPayment += netAmount + taxAmount;
            acc[method].quantity! += totalQuantity;
            acc[method].transactions++;
            acc[method].paymentSales[method] += netAmount;
            acc[method].paymentQuantities[method] += totalQuantity;
        });
        return acc;
      }, {} as Record<string, ReportDataPoint>);
      setSalesByPayment(Object.values(paymentSales).sort((a, b) => b.sales - a.sales));

      setLoading(false);
  }, [date, filters, sales, products, categories, users, posDevices, paymentTypes, allTaxes]);
  
    useEffect(() => {
    // Populate the calculator with all products when the page loads or products change
    const storeId = filters.storeId; // Use the selected store filter
    const initialCalcData = products.map(product => {
        const storeProduct = product.store_products.find(sp => storeId === 'all' ? true : sp.store_id === storeId);
        // If 'all' stores, we might need a better way to aggregate stock, for now just use first available
        const mainStoreProduct = product.store_products[0];
        
        return {
            productId: product.id,
            name: product.name,
            originalStock: storeProduct?.stock ?? mainStoreProduct?.stock ?? 0,
            sold: null,
            addedStock: null,
            remaining: null,
        }
    });
    setInventoryCalcData(initialCalcData);
  }, [products, filters.storeId]);


  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleColumnVisibilityChange = (column: keyof VisibleColumns, checked: boolean) => {
    setVisibleColumns(prev => ({...prev, [column]: checked }));
  };

  const filteredData = useMemo(() => {
    const term = filters.searchTerm.toLowerCase();
    if (!term) {
        return {
            item: salesByItem,
            category: salesByCategory,
            employee: salesByEmployee,
            payment: salesByPayment,
            transaction: salesByTransaction,
        };
    }

    return {
        item: salesByItem.filter(d => d.name.toLowerCase().includes(term) || d.category?.toLowerCase().includes(term)),
        category: salesByCategory.filter(d => d.name.toLowerCase().includes(term)),
        employee: salesByEmployee.filter(d => d.name.toLowerCase().includes(term)),
        payment: salesByPayment.filter(d => d.name.toLowerCase().includes(term)),
        transaction: salesByTransaction.filter(d => 
            d.orderNumber.toString().includes(term) ||
            d.employee.toLowerCase().includes(term) ||
            d.customer.toLowerCase().includes(term) ||
            d.items.toLowerCase().includes(term) ||
            d.categories.toLowerCase().includes(term)
        ),
    };
  }, [filters.searchTerm, salesByItem, salesByCategory, salesByEmployee, salesByPayment, salesByTransaction]);

  const handleExport = () => {
    let dataToExport: any[] = [];
    let reportName = activeTab;

    switch(activeTab) {
      case 'item': dataToExport = filteredData.item; break;
      case 'category': dataToExport = filteredData.category; break;
      case 'employee': dataToExport = filteredData.employee; break;
      case 'payment': dataToExport = filteredData.payment; break;
      case 'transaction': dataToExport = filteredData.transaction; break;
    }

    const csvData = dataToExport.map(d => {
        if (activeTab === 'transaction') {
            return {
                "Order #": d.orderNumber, "Date": d.date, "Employee": d.employee, "Customer": d.customer,
                "Items": d.items, "Categories": d.categories, "Total": d.total.toFixed(2), "Payment Methods": d.paymentMethods.join(', ')
            };
        }
        const row: {[key: string]: any} = {
            Name: d.name, Category: d.category, "Net Sales": d.sales.toFixed(2), "Tax": d.tax.toFixed(2),
            "Net Payment": d.netPayment.toFixed(2), "Items Sold": d.quantity, Transactions: d.transactions,
        };
        paymentTypes.forEach(pt => {
            row[`${pt.name} Sales`] = (d.paymentSales[pt.name] || 0).toFixed(2);
            row[`Items Sold (${pt.name})`] = (d.paymentQuantities[pt.name] || 0).toFixed(0);
        });
        return row;
    });

    const csv = Papa.unparse(csvData);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportName}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: "Report has been downloaded." });
  }
  
  // --- Inventory Calculator Functions ---

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);
  
  const handleDoubleClick = (productId: string, field: 'addedStock') => {
    const currentItem = inventoryCalcData.find(item => item.productId === productId);
    if (!currentItem) return;
    setEditingCell({ productId, field });
    setEditValue((currentItem[field] || '').toString());
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };
  
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { productId, field } = editingCell;
    const value = parseInt(editValue, 10);

    setInventoryCalcData(prevData =>
      prevData.map(item =>
        item.productId === productId
          ? { ...item, [field]: isNaN(value) ? null : value, remaining: null } // Reset remaining on edit
          : item
      )
    );
    handleCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
    }
  };

  const handleCopySoldItemsToCalc = () => {
    const salesReportMap = new Map(filteredData.item.map(item => [item.name, item.quantity]));
    
    setInventoryCalcData(prevData =>
        prevData.map(calcItem => ({
            ...calcItem,
            sold: salesReportMap.get(calcItem.name) || 0,
            remaining: null, // Reset remaining when new sold data is copied
        }))
    );
    toast({ title: "Data Copied", description: "Items sold have been populated in the calculator." });
  };

  const handleCalculateRemaining = () => {
    setInventoryCalcData(prevData =>
        prevData.map(item => {
            if (item.sold !== null) {
                const added = item.addedStock || 0;
                return { ...item, remaining: item.originalStock - item.sold + added };
            }
            return item;
        })
    );
     toast({ title: "Calculation Complete", description: "Remaining stock has been calculated." });
  };
  
  const handleUpdateInventory = async () => {
    try {
        const storeIdToUpdate = filters.storeId;
        if (storeIdToUpdate === 'all') {
            toast({
                title: "Store Selection Required",
                description: "Please select a specific store from the filters to update inventory.",
                variant: "destructive"
            });
            return;
        }

        const updatedProducts = products.map(p => {
            const calcItem = inventoryCalcData.find(item => item.productId === p.id && item.remaining !== null);
            if (!calcItem) return p;

            const newStoreProducts = p.store_products.map(sp => {
                if (sp.store_id === storeIdToUpdate) {
                    return { ...sp, stock: calcItem.remaining! };
                }
                return sp;
            });
            return { ...p, store_products: newStoreProducts };
        });

        await setProducts(updatedProducts);
        
        // Refresh original stock in calculator after update
        setInventoryCalcData(prevData =>
            prevData.map(item => ({
                ...item,
                originalStock: item.remaining !== null ? item.remaining : item.originalStock,
                sold: null,
                addedStock: null,
                remaining: null,
            }))
        );
        
        toast({ title: "Inventory Updated", description: "Stock levels have been successfully updated." });
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsUpdateConfirmOpen(false);
    }
  };

  const handleExportTemplate = () => {
    const headers = ["Item Name", "New Stock Added"];
    const csv = Papa.unparse({
      fields: headers,
      data: inventoryCalcData.map(item => ({
        "Item Name": item.name,
        "New Stock Added": "", // Export with an empty column
      })),
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_addition_template_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded" });
  };

  const handleImportAdditions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            try {
                const importedData = results.data as any[];
                const additionsMap = new Map(
                    importedData.map(row => [
                        row["Item Name"], 
                        parseInt(row["New Stock Added"], 10) || 0
                    ])
                );

                setInventoryCalcData(prevData =>
                    prevData.map(item => {
                        const added = additionsMap.get(item.name);
                        return {
                            ...item,
                            addedStock: added !== undefined ? added : item.addedStock,
                            remaining: null, // Reset remaining
                        };
                    })
                );
                toast({ title: "Import Successful", description: "New stock additions have been imported." });
            } catch (error: any) {
                toast({ title: "Import Error", description: error.message, variant: "destructive" });
            } finally {
                setIsProcessingImport(false);
                setIsImportDialogOpen(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        },
        error: (error: any) => {
            toast({ title: "Import Error", description: error.message, variant: "destructive" });
            setIsProcessingImport(false);
        }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Sales Reports"
          description="Analyze your sales performance."
        />
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Popover>
            <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
            </PopoverContent>
            </Popover>
            <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2 sm:mr-0"/> <span className="sm:hidden">Export</span></Button>
        </div>
      </div>

    <Card>
        <CardHeader>
            <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search all reports..."
                    className="pl-9"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={filters.storeId} onValueChange={(v) => handleFilterChange('storeId', v)}>
                    <SelectTrigger><SelectValue placeholder="Filter by Store"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.deviceId} onValueChange={(v) => handleFilterChange('deviceId', v)} disabled={filters.storeId === 'all' && availableDevices.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Filter by Device"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Devices</SelectItem>
                        {availableDevices.map(device => <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.employeeId} onValueChange={(v) => handleFilterChange('employeeId', v)}>
                    <SelectTrigger><SelectValue placeholder="Filter by Employee"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {users.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.paymentTypeId} onValueChange={(v) => handleFilterChange('paymentTypeId', v)}>
                    <SelectTrigger><SelectValue placeholder="Filter by Payment Type"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payment Types</SelectItem>
                        {paymentTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.itemSortOrder} onValueChange={(v) => handleFilterChange('itemSortOrder', v)}>
                    <SelectTrigger><SelectValue placeholder="Sort by..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="top-sellers">Top Sellers</SelectItem>
                        <SelectItem value="inventory">Inventory Order</SelectItem>
                    </SelectContent>
                </Select>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Display Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[220px]">
                        <DropdownMenuLabel>Toggle Metric Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={visibleColumns.netSales} onCheckedChange={(c) => handleColumnVisibilityChange('netSales', c)}>Net Sales</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={visibleColumns.tax} onCheckedChange={(c) => handleColumnVisibilityChange('tax', c)}>Tax</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={visibleColumns.netPayment} onCheckedChange={(c) => handleColumnVisibilityChange('netPayment', c)}>Net Payment</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={visibleColumns.itemsSold} onCheckedChange={(c) => handleColumnVisibilityChange('itemsSold', c)}>Items Sold</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={visibleColumns.transactions} onCheckedChange={(c) => handleColumnVisibilityChange('transactions', c)}>Transactions</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={(c) => handleColumnVisibilityChange('category', c)}>Category</DropdownMenuCheckboxItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Payment Sales</DropdownMenuLabel>
                        {paymentTypes.map(pt => (
                        <DropdownMenuCheckboxItem key={pt.id} checked={visibleColumns[`${pt.name} Sales`]} onCheckedChange={(c) => handleColumnVisibilityChange(`${pt.name} Sales`, c)}>
                            {pt.name} Sales
                        </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Items Sold by Payment</DropdownMenuLabel>
                        {paymentTypes.map(pt => (
                        <DropdownMenuCheckboxItem key={`${pt.id}-items`} checked={visibleColumns[`Items Sold (${pt.name})`]} onCheckedChange={(c) => handleColumnVisibilityChange(`Items Sold (${pt.name})`, c)}>
                            Items Sold ({pt.name})
                        </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardContent>
    </Card>

      <Tabs defaultValue="item" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="item">By Item</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="payment">By Payment Type</TabsTrigger>
          <TabsTrigger value="transaction">By Transaction</TabsTrigger>
        </TabsList>
        
        <TabsContent value="item" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <>
                    <ReportChart data={filteredData.item} title="Sales by Item" currency={currency} />
                    <ReportTable 
                        data={filteredData.item} 
                        dataKeyLabel="Item" 
                        currency={currency} 
                        visibleColumns={visibleColumns} 
                        paymentTypes={paymentTypes}
                        onCopySoldItems={handleCopySoldItemsToCalc}
                        isInventorySort={filters.itemSortOrder === 'inventory'}
                    />
                    
                    {/* Inventory Calculator Table */}
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle>Inventory Calculator</CardTitle>
                                <CardDescription>
                                    Use this tool to compare sales against inventory and update stock levels. Double-click a cell in 'New Stock Added' to edit.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                                <Button variant="outline" onClick={handleExportTemplate}><Download className="mr-2 h-4 w-4" /> Export</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead className="text-right">Original Stock</TableHead>
                                            <TableHead className="text-right">Items Sold (from report)</TableHead>
                                            <TableHead className="text-right">New Stock Added</TableHead>
                                            <TableHead className="text-right">Calculated Remaining Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inventoryCalcData.map(item => (
                                            <TableRow key={item.productId}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right">{item.originalStock}</TableCell>
                                                <TableCell className="text-right font-semibold text-blue-600">{item.sold ?? '-'}</TableCell>
                                                <TableCell className="text-right" onDoubleClick={() => handleDoubleClick(item.productId, 'addedStock')}>
                                                    {editingCell?.productId === item.productId && editingCell?.field === 'addedStock' ? (
                                                        <Input
                                                            ref={editInputRef}
                                                            type="number"
                                                            value={editValue}
                                                            onChange={handleEditChange}
                                                            onKeyDown={handleKeyDown}
                                                            onBlur={handleSaveEdit}
                                                            className="h-8 w-24 ml-auto"
                                                        />
                                                    ) : (
                                                        <span className="font-semibold text-orange-600">{item.addedStock ?? '-'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-green-600">{item.remaining ?? '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                             <Button variant="outline" onClick={handleCalculateRemaining}>
                                <Calculator className="mr-2 h-4 w-4" /> Calculate Remaining Stock
                             </Button>
                             <Button onClick={() => setIsUpdateConfirmOpen(true)}>
                                <Check className="mr-2 h-4 w-4" /> Update Inventory Stock
                             </Button>
                        </CardFooter>
                    </Card>
                </>
            )}
        </TabsContent>
        <TabsContent value="category" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <>
                    <ReportChart data={filteredData.category} title="Sales by Category" currency={currency} />
                    <ReportTable data={filteredData.category} dataKeyLabel="Category" currency={currency} visibleColumns={visibleColumns} paymentTypes={paymentTypes} onCopySoldItems={() => {}} isInventorySort={false}/>
                </>
            )}
        </TabsContent>
        <TabsContent value="employee" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={filteredData.employee} title="Sales by Employee" currency={currency} />
                    <ReportTable data={filteredData.employee} dataKeyLabel="Employee" currency={currency} visibleColumns={visibleColumns} paymentTypes={paymentTypes} onCopySoldItems={() => {}} isInventorySort={false}/>
                </>
            )}
        </TabsContent>
         <TabsContent value="payment" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                 <>
                    <ReportChart data={filteredData.payment} title="Sales by Payment Type" currency={currency} />
                    <ReportTable data={filteredData.payment} dataKeyLabel="Payment Type" currency={currency} visibleColumns={visibleColumns} paymentTypes={paymentTypes} onCopySoldItems={() => {}} isInventorySort={false}/>
                </>
            )}
        </TabsContent>
        <TabsContent value="transaction" className="pt-4 space-y-4">
            {loading ? <p>Loading report...</p> : (
                <Card>
                    <CardHeader><CardTitle>Sales Transactions</CardTitle><CardDescription>A detailed log of all individual sales.</CardDescription></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Categories</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.transaction.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>#{tx.orderNumber}</TableCell>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell>{tx.employee}</TableCell>
                                        <TableCell>{tx.customer}</TableCell>
                                        <TableCell className="max-w-xs truncate">{tx.items}</TableCell>
                                        <TableCell className="max-w-xs truncate">{tx.categories}</TableCell>
                                        <TableCell className="text-right">{currency}{tx.total.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {tx.paymentMethods.map(pm => <Badge key={pm} variant="outline">{pm}</Badge>)}
                                          </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Inventory Update</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-start gap-3 bg-yellow-50 text-yellow-900 p-3 rounded-md border border-yellow-200 my-2">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                    <p className="font-semibold">This action cannot be undone.</p>
                    <p>
                        This will permanently overwrite the current stock levels in your inventory with the new calculated values.
                        Please ensure the calculations are correct before proceeding.
                    </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateInventory}>Confirm and Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <CardContent>
            <CardHeader>
                <CardTitle>Import New Stock</CardTitle>
                <CardDescription>
                    Upload a CSV file with "Item Name" and "New Stock Added" columns to bulk update additions.
                </CardDescription>
            </CardHeader>
            <div className="py-4 space-y-4">
                <Input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportAdditions} disabled={isProcessingImport} />
                {isProcessingImport && <p className="text-sm text-muted-foreground mt-2 flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing file...</p>}
            </div>
        </CardContent>
      </Dialog>
    </div>
  );
}
