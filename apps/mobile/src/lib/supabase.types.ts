export interface Database {
  public: {
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_wallet_top_up: {
        Args: {
          p_amount: number;
          p_title: string;
          p_subtitle: string;
        };
        Returns: {
          id: string;
          balance: number;
          points: number;
          payment_methods: string[];
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Tables: {
      bikes: {
        Row: {
          id: string;
          model: string;
          ride_class: string | null;
          estimated_range_km: number;
          top_speed_kmh: number;
          pricing_label: string;
          status: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          model: string;
          ride_class?: string | null;
          estimated_range_km: number;
          top_speed_kmh: number;
          pricing_label: string;
          status?: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          model?: string;
          ride_class?: string | null;
          estimated_range_km?: number;
          top_speed_kmh?: number;
          pricing_label?: string;
          status?: "available" | "reserved" | "in_use" | "maintenance";
          location?: string;
          latitude?: number;
          longitude?: number;
          last_reported_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          first_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          type: "ride" | "top_up" | "reward";
          title: string;
          subtitle: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          type: "ride" | "top_up" | "reward";
          title: string;
          subtitle: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          type?: "ride" | "top_up" | "reward";
          title?: string;
          subtitle?: string;
          amount?: number;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          balance: number;
          points: number;
          payment_methods: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          balance?: number;
          points?: number;
          payment_methods?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          points?: number;
          payment_methods?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export interface Profile {
  readonly id: string;
  readonly firstName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
