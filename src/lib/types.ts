
import type { AnyPermission } from "./permissions";

export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type User = Omit<Database['public']['Tables']['users']['Row'], 'permissions'> & {
    permissions: AnyPermission[];
}
export type Customer = Database['public']['Tables']['customers']['Row']
export type Sale = Omit<Database['public']['Tables']['sales']['Row'], 'items' | 'payment_methods'> & {
  items: SaleItem[];
  payment_methods: string[];
  customers: Customer | null;
  users: Pick<User, 'name'> | null;
};
export type Debt = Database['public']['Tables']['debts']['Row'] & {
  sales: { order_number: number | null } | null;
  customers: { name: string | null } | null;
};
export type Reservation = Database['public']['Tables']['reservations']['Row'] & {
  products: { name: string | null } | null;
};
export type OpenTicket = Database['public']['Tables']['open_tickets']['Row'] & {
  users: { name: string | null } | null;
  customers: { name: string | null } | null;
};


export type SaleItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export type Role = {
  id: string;
  name: string;
  permissions: AnyPermission[];
};

export type UserRole = "Owner" | "Administrator" | "Manager" | "Cashier";


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
      debts: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          sale_id: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sale_id?: string | null
          status: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sale_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
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
          ticket_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          employee_id?: string | null
          customer_id?: string | null
          items: Json
          total: number
          notes?: string | null
          ticket_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          employee_id?: string | null
          customer_id?: string | null
          items?: Json
          total?: number
          notes?: string | null
          ticket_name?: string | null
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
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock: number
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
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
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          guest_name: string
          id?: string
          product_id?: string | null
          status: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          guest_name?: string
          id?: string
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          }
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          permissions: Json | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          permissions?: Json | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          permissions?: Json | null
          role?: string
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
