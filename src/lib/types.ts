

import type { AnyPermission } from "./permissions";

export type TimeRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: 'pending' | 'approved' | 'rejected';
  businessId: string;
  videoUrl?: string | null;
};

export type Business = {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export type OfflineAction = {
    id: string; // Document ID to act upon
    collection: string;
    type: 'delete' | 'restore'; // Can be expanded to 'create', 'update'
    timestamp: string;
    payload?: any; // To hold data for complex actions like restore
};

export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  metadata: {
    size: number;
    contentType?: string | undefined;
    updated: string;
    timeCreated: string;
  };
}

export type BranchProduct = {
  id: string;
  branch_id: string;
  product_id: string;
  price: number;
  stock: number;
  businessId: string;
};

export type Shift = {
  id: string;
  userId: string;
  businessId: string;
  startTime: string;
  endTime: string | null;
  status: 'active' | 'closed' | 'temp-active';
  user?: User | null;
  branchId?: string | null;
  posDeviceId?: string | null;
};

export type AccessCode = {
  id: string;
  code: string;
  status: 'valid' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
  businessId: string;
};

export type Category = Database['public']['Tables']['categories']['Row'] & { businessId: string };
export type Product = Omit<Database['public']['Tables']['products']['Row'], 'price' | 'stock'> & { 
  businessId: string;
  branch_products: BranchProduct[];
};
export type User = Omit<Database['public']['Tables']['users']['Row'], 'permissions' | 'department'> & {
    permissions: AnyPermission[];
    department: string;
    password?: string;
    businessId: string;
    temp_access_given?: boolean;
}
export type Customer = Database['public']['Tables']['customers']['Row'] & { businessId: string };
export type Sale = Omit<Database['public']['Tables']['sales']['Row'], 'items' | 'payment_methods'> & {
  items: SaleItem[];
  payment_methods: string[];
  customers: Customer | null;
  users: User | null;
  pos_devices: { branch_id: string } | null;
  businessId: string;
  fulfillment_status?: 'Unfulfilled' | 'Pending' | 'Fulfilled';
  branchName?: string;
  deviceName?: string;
  employeeName?: string | null;
  pdf_url?: string | null;
};
export type Reservation = Omit<Database['public']['Tables']['reservations']['Row'], 'id'> & {
  id?: string;
  products: { name: string | null; price: number | null; } | null;
  sale_id: string | null;
  businessId: string;
};
export type Debt = {
  id: string;
  sale_id: string;
  customer_id: string | null;
  amount: number;
  status: 'Paid' | 'Unpaid';
  created_at: string;
  sales: Sale | null;
  customers: Customer | null;
  businessId: string;
};
export type OpenTicket = Database['public']['Tables']['open_tickets']['Row'] & {
  id: string; // Ensure id is always present
  users: { name: string | null } | null;
  customers: { name: string | null } | null;
  businessId: string;
  fulfillment_status?: 'Unfulfilled' | 'Pending' | 'Fulfilled';
};
export type BranchType = Database['public']['Tables']['branches']['Row'] & { businessId: string };
export type PosDeviceType = Database['public']['Tables']['pos_devices']['Row'] & { 
  businessId: string;
  in_use_by_shift_id: string | null;
};
export type PaymentType = Database['public']['Tables']['payment_types']['Row'] & { businessId: string };

export type PrinterType = {
    id: string;
    name: string;
    connection_type: 'Network' | 'Bluetooth' | 'Cable';
    ip_address?: string | null;
    pos_device_id: string;
    businessId: string;
};

export type ReceiptSettings = {
  header: string;
  footer: string;
  emailedLogo: string | null;
  printedLogo: string | null;
  showCustomerInfo: boolean;
  showComments: boolean;
  language: string;
};

export type BusinessSettings = {
    featureSettings: FeatureSettings;
    receiptSettings: Record<string, ReceiptSettings>;
    currency: string;
};

export type Tax = {
    id: string;
    name: string;
    rate: number;
    is_default: boolean;
    type: 'Included' | 'Added';
    businessId: string;
};

export type SaleItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  fulfilled_quantity?: number;
}

export type Department = {
  id: string;
  name: string;
  permissions: AnyPermission[];
  businessId: string;
};

export type UserDepartment = "Owner" | "Administrator" | "Manager";

export type VoidedLog = {
  id: string;
  type: 'ticket' | 'item' | 'receipt' | 'reservation';
  voided_by_employee_id: string;
  created_at: string; // This is the date of the void action
  data: Partial<Sale & OpenTicket & {
    ticket_name?: string;
    item_name?: string;
    quantity?: number;
    price?: number;
    ticket_total?: number;
    customer_name?: string | null;
    receipt_id?: string;
    order_number?: number;
    receipt_total?: number;
    reservation_check_out?: string;
    branchName?: string;
    deviceName?: string;
  }>;
  users: { name: string | null } | null;
  businessId: string;
};


// SUPABASE TYPE DEFINITIONS
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      open_tickets: {
        Row: {
          id: string
          created_at: string | null
          employee_id: string | null
          customer_id: string | null
          items: Json
          total: number
          notes: string | null
          order_number: number | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          employee_id?: string | null
          customer_id?: string | null
          items: Json
          total: number
          notes?: string | null
          order_number?: number | null
        }
        Update: {
          id?: string
          created_at?: string | null
          employee_id?: string | null
          customer_id?: string | null
          items?: Json
          total?: number
          notes?: string | null
          order_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "open_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_types: {
        Row: {
            id: string
            name: string
            type: 'Cash' | 'Card' | 'Credit' | 'Other'
        }
        Insert: {
            id: string
            name: string
            type: 'Cash' | 'Card' | 'Credit' | 'Other'
        }
        Update: {
            id?: string
            name?: string
            type?: 'Cash' | 'Card' | 'Credit' | 'Other'
        }
        Relationships: []
      }
      pos_devices: {
        Row: {
          id: string
          name: string
          branch_id: string
          in_use_by_shift_id: string | null
        }
        Insert: {
          id: string
          name: string
          branch_id: string
          in_use_by_shift_id: string | null
        }
        Update: {
          id?: string
          name?: string
          branch_id?: string
          in_use_by_shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
          status: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock: number
          status?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          guest_name: string
          id: string
          product_id: string | null
          status: string
          sale_id: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          guest_name: string
          id?: string
          product_id?: string | null
          status: string
          sale_id?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_name?: string
          id?: string
          product_id?: string | null
          status?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          employee_id: string | null
          id: string
          items: Json
          order_number: number
          payment_methods: Json
          status: string
          total: number
          pos_device_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          items: Json
          order_number?: number
          payment_methods: Json
          status: string
          total: number
          pos_device_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          items?: Json
          order_number?: number
          payment_methods?: Json
          status?: string
          total?: number
          pos_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pos_device"
            columns: ["pos_device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          }
        ]
      }
      branches: {
        Row: {
          id: string
          name: string
          address: string
        }
        Insert: {
          id: string
          name: string
          address: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          permissions: Json | null
          department: string
          password?: string | null,
          temp_access_given?: boolean | null,
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          permissions?: Json | null
          department: string
          password?: string | null,
          temp_access_given?: boolean | null,
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string
          permissions?: Json | null
          department?: string
          password?: string | null,
          temp_access_given?: boolean | null,
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

    
