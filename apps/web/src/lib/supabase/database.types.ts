export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bike_ride_history: {
        Row: {
          bike_id: string;
          checkpoints: Json;
          co2_saved_kg: number;
          completed_at: string;
          created_at: string;
          distance_km: number;
          duration_sec: number;
          end_location: string;
          id: string;
          payment_label: string;
          route: Json;
          route_label: string;
          start_location: string;
          started_at: string;
          total_cost: number;
        };
        Insert: {
          bike_id: string;
          checkpoints?: Json;
          co2_saved_kg?: number;
          completed_at: string;
          created_at?: string;
          distance_km: number;
          duration_sec: number;
          end_location: string;
          id?: string;
          payment_label: string;
          route?: Json;
          route_label: string;
          start_location: string;
          started_at: string;
          total_cost: number;
        };
        Update: {
          bike_id?: string;
          checkpoints?: Json;
          co2_saved_kg?: number;
          completed_at?: string;
          created_at?: string;
          distance_km?: number;
          duration_sec?: number;
          end_location?: string;
          id?: string;
          payment_label?: string;
          route?: Json;
          route_label?: string;
          start_location?: string;
          started_at?: string;
          total_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bike_ride_history_bike_id_fkey";
            columns: ["bike_id"];
            isOneToOne: false;
            referencedRelation: "bikes";
            referencedColumns: ["id"];
          }
        ];
      };
      bikes: {
        Row: {
          created_at: string;
          estimated_range_km: number;
          id: string;
          image_url: string | null;
          last_reported_at: string;
          latitude: number;
          location: string;
          longitude: number;
          model: string;
          pricing_label: string;
          ride_class: string | null;
          status: Database["public"]["Enums"]["bike_status"];
          top_speed_kmh: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          estimated_range_km: number;
          id: string;
          image_url?: string | null;
          last_reported_at?: string;
          latitude: number;
          location: string;
          longitude: number;
          model: string;
          pricing_label: string;
          ride_class?: string | null;
          status?: Database["public"]["Enums"]["bike_status"];
          top_speed_kmh: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          estimated_range_km?: number;
          id?: string;
          image_url?: string | null;
          last_reported_at?: string;
          latitude?: number;
          location?: string;
          longitude?: number;
          model?: string;
          pricing_label?: string;
          ride_class?: string | null;
          status?: Database["public"]["Enums"]["bike_status"];
          top_speed_kmh?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          first_name: string;
          id: string;
          is_admin: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          first_name: string;
          id: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          id?: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          subtitle: string;
          title: string;
          type: "ride" | "top_up" | "reward";
          wallet_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          subtitle: string;
          title: string;
          type: "ride" | "top_up" | "reward";
          wallet_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          subtitle?: string;
          title?: string;
          type?: "ride" | "top_up" | "reward";
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          }
        ];
      };
      wallets: {
        Row: {
          balance: number;
          created_at: string;
          id: string;
          payment_methods: string[];
          points: number;
          updated_at: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          id: string;
          payment_methods?: string[];
          points?: number;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          id?: string;
          payment_methods?: string[];
          points?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_wallet_top_up: {
        Args: { p_amount: number; p_subtitle: string; p_title: string };
        Returns: {
          balance: number;
          created_at: string;
          id: string;
          payment_methods: string[];
          points: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "wallets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      bike_status: "available" | "reserved" | "in_use" | "maintenance";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
export type BikeRideHistoryRow = Database["public"]["Tables"]["bike_ride_history"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const Constants = {
  public: {
    Enums: {
      bike_status: ["available", "reserved", "in_use", "maintenance"]
    }
  }
} as const;
