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
      bike_ride_history: {
        Row: {
          id: string;
          bike_id: string;
          profile_id: string | null;
          started_at: string;
          completed_at: string;
          duration_sec: number;
          distance_km: number;
          total_cost: number;
          co2_saved_kg: number;
          start_location: string;
          end_location: string;
          route_label: string;
          payment_label: string;
          route: Json;
          checkpoints: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          bike_id: string;
          profile_id?: string | null;
          started_at: string;
          completed_at: string;
          duration_sec: number;
          distance_km: number;
          total_cost: number;
          co2_saved_kg?: number;
          start_location: string;
          end_location: string;
          route_label: string;
          payment_label: string;
          route?: Json;
          checkpoints?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          bike_id?: string;
          profile_id?: string | null;
          started_at?: string;
          completed_at?: string;
          duration_sec?: number;
          distance_km?: number;
          total_cost?: number;
          co2_saved_kg?: number;
          start_location?: string;
          end_location?: string;
          route_label?: string;
          payment_label?: string;
          route?: Json;
          checkpoints?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      bikes: {
        Row: {
          active_rider_id: string | null;
          created_at: string;
          estimated_range_km: number;
          id: string;
          model: string;
          image_url: string | null;
          ride_class: string | null;
          top_speed_kmh: number;
          pricing_label: string;
          status: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at: string;
          updated_at: string;
        };
        Insert: {
          active_rider_id?: string | null;
          created_at?: string;
          estimated_range_km: number;
          id: string;
          model: string;
          image_url?: string | null;
          ride_class?: string | null;
          top_speed_kmh: number;
          pricing_label: string;
          status?: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at?: string;
          updated_at?: string;
        };
        Update: {
          active_rider_id?: string | null;
          created_at?: string;
          estimated_range_km?: number;
          id?: string;
          model?: string;
          image_url?: string | null;
          ride_class?: string | null;
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
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          is_admin?: boolean;
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
