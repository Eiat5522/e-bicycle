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
      complete_ride: {
        Args: {
          p_bike_id: string;
          p_distance_km?: number;
          p_end_location?: string | null;
          p_route_label?: string | null;
          p_route?: Json;
          p_checkpoints?: Json;
          p_co2_saved_kg?: number;
        };
        Returns: Database["public"]["Tables"]["bike_ride_history"]["Row"];
      };
    };
    Tables: {
      asset_inventory: {
        Row: {
          id: string;
          item_description: string;
          quantity: number;
          station_id: string | null;
          procurement_date: string | null;
          warranty_status: string;
          maintenance_period: string | null;
          stock_level: number;
          minimum_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_description: string;
          quantity?: number;
          station_id?: string | null;
          procurement_date?: string | null;
          warranty_status?: string;
          maintenance_period?: string | null;
          stock_level?: number;
          minimum_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["asset_inventory"]["Insert"]>;
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          entity_table: string;
          entity_id: string;
          attachment_type: string;
          file_url: string;
          storage_bucket: string | null;
          storage_path: string | null;
          content_type: string | null;
          uploaded_by_profile_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_table: string;
          entity_id: string;
          attachment_type: string;
          file_url: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          content_type?: string | null;
          uploaded_by_profile_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_profile_id: string | null;
          actor_staff_id: string | null;
          user_role: string | null;
          action_performed: string;
          entity_table: string | null;
          entity_id: string | null;
          data_changed: Json;
          device_location: string | null;
          kpi_achievement: number | null;
          evidence_attachment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_profile_id?: string | null;
          actor_staff_id?: string | null;
          user_role?: string | null;
          action_performed: string;
          entity_table?: string | null;
          entity_id?: string | null;
          data_changed?: Json;
          device_location?: string | null;
          kpi_achievement?: number | null;
          evidence_attachment_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      batteries: {
        Row: {
          id: string;
          battery_code: string;
          bike_id: string | null;
          station_id: string | null;
          status: string;
          charge_level: number | null;
          charge_cycles: number;
          state_of_health: number | null;
          last_inspection_date: string | null;
          health_history: string | null;
          charging_slot_id: string | null;
          voltage: number | null;
          current_amp: number | null;
          temperature_c: number | null;
          retirement_plan: string | null;
          abnormal_flag: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          battery_code: string;
          bike_id?: string | null;
          station_id?: string | null;
          status?: string;
          charge_level?: number | null;
          charge_cycles?: number;
          state_of_health?: number | null;
          last_inspection_date?: string | null;
          health_history?: string | null;
          charging_slot_id?: string | null;
          voltage?: number | null;
          current_amp?: number | null;
          temperature_c?: number | null;
          retirement_plan?: string | null;
          abnormal_flag?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["batteries"]["Insert"]>;
        Relationships: [];
      };
      rental_transactions: {
        Row: {
          bike_id: string;
          billable_minutes: number;
          checkpoints: Json;
          co2_saved_kg: number;
          completed_at: string;
          created_at: string;
          currency_code: string;
          distance_km: number;
          duration_sec: number;
          entered_by_staff_id: string | null;
          end_location: string;
          fallback_form_id: string | null;
          fare_calculation_method: string;
          id: string;
          import_batch_id: string | null;
          payment_label: string;
          payment_id: string | null;
          photo_evidence_url: string | null;
          profile_id: string | null;
          rate_per_minute: number;
          reconciled_at: string | null;
          rental_status: string;
          return_station_id: string | null;
          route: Json;
          route_distance_km: number | null;
          route_label: string;
          service_fee: number | null;
          source_system: string;
          start_location: string;
          start_station_id: string | null;
          started_at: string;
          total_cost: number;
          wallet_transaction_id: string | null;
        };
        Insert: {
          bike_id: string;
          billable_minutes?: number;
          checkpoints?: Json;
          co2_saved_kg?: number;
          completed_at: string;
          created_at?: string;
          currency_code?: string;
          distance_km: number;
          duration_sec: number;
          entered_by_staff_id?: string | null;
          end_location: string;
          fallback_form_id?: string | null;
          fare_calculation_method?: string;
          id?: string;
          import_batch_id?: string | null;
          payment_label: string;
          payment_id?: string | null;
          photo_evidence_url?: string | null;
          profile_id?: string | null;
          rate_per_minute?: number;
          reconciled_at?: string | null;
          rental_status?: string;
          return_station_id?: string | null;
          route?: Json;
          route_distance_km?: number | null;
          route_label: string;
          service_fee?: number | null;
          source_system?: string;
          start_location: string;
          start_station_id?: string | null;
          started_at: string;
          total_cost: number;
          wallet_transaction_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rental_transactions"]["Insert"]>;
        Relationships: [];
      };
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
          rate_per_minute: number;
          billable_minutes: number;
          currency_code: string;
          wallet_transaction_id: string | null;
          fare_calculation_method: string;
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
          rate_per_minute?: number;
          billable_minutes?: number;
          currency_code?: string;
          wallet_transaction_id?: string | null;
          fare_calculation_method?: string;
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
          rate_per_minute?: number;
          billable_minutes?: number;
          currency_code?: string;
          wallet_transaction_id?: string | null;
          fare_calculation_method?: string;
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
      incidents: {
        Row: {
          id: string;
          rental_transaction_id: string | null;
          bike_id: string | null;
          profile_id: string | null;
          incident_type: string;
          description: string | null;
          status: string;
          resolution_status: string;
          assigned_staff_id: string | null;
          source_system: string;
          fallback_form_id: string | null;
          import_batch_id: string | null;
          entered_by_staff_id: string | null;
          reconciled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rental_transaction_id?: string | null;
          bike_id?: string | null;
          profile_id?: string | null;
          incident_type: string;
          description?: string | null;
          status?: string;
          resolution_status?: string;
          assigned_staff_id?: string | null;
          source_system?: string;
          fallback_form_id?: string | null;
          import_batch_id?: string | null;
          entered_by_staff_id?: string | null;
          reconciled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Insert"]>;
        Relationships: [];
      };
      maintenance_logs: {
        Row: {
          id: string;
          bike_id: string | null;
          asset_id: string | null;
          repair_type: string;
          date_reported: string;
          date_finished: string | null;
          parts_used: Json;
          technician_staff_id: string | null;
          post_repair_status: string | null;
          next_service_schedule: string | null;
          quality_check_status: string;
          status: string;
          source_system: string;
          fallback_form_id: string | null;
          import_batch_id: string | null;
          entered_by_staff_id: string | null;
          reconciled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bike_id?: string | null;
          asset_id?: string | null;
          repair_type: string;
          date_reported?: string;
          date_finished?: string | null;
          parts_used?: Json;
          technician_staff_id?: string | null;
          post_repair_status?: string | null;
          next_service_schedule?: string | null;
          quality_check_status?: string;
          status?: string;
          source_system?: string;
          fallback_form_id?: string | null;
          import_batch_id?: string | null;
          entered_by_staff_id?: string | null;
          reconciled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_logs"]["Insert"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          rental_transaction_id: string | null;
          wallet_transaction_id: string | null;
          profile_id: string | null;
          amount: number;
          currency_code: string;
          payment_method: string;
          payment_reference: string | null;
          payment_time: string | null;
          payment_status: string;
          evidence_file_url: string | null;
          coupon_id: string | null;
          reconciliation_status: string;
          source_system: string;
          fallback_form_id: string | null;
          import_batch_id: string | null;
          entered_by_staff_id: string | null;
          reconciled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rental_transaction_id?: string | null;
          wallet_transaction_id?: string | null;
          profile_id?: string | null;
          amount: number;
          currency_code?: string;
          payment_method: string;
          payment_reference?: string | null;
          payment_time?: string | null;
          payment_status?: string;
          evidence_file_url?: string | null;
          coupon_id?: string | null;
          reconciliation_status?: string;
          source_system?: string;
          fallback_form_id?: string | null;
          import_batch_id?: string | null;
          entered_by_staff_id?: string | null;
          reconciled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [];
      };
      bikes: {
        Row: {
          active_rider_id: string | null;
          battery_status: string;
          color: string | null;
          created_at: string;
          current_battery_id: string | null;
          device_status: string;
          estimated_range_km: number;
          frame_number: string | null;
          id: string;
          model: string;
          image_url: string | null;
          ride_class: string | null;
          top_speed_kmh: number;
          pricing_label: string;
          qr_code: string | null;
          rate_per_minute: number;
          status: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at: string;
          maintenance_summary: string | null;
          serial_number: string | null;
          station_id: string | null;
          active_ride_started_at: string | null;
          active_ride_start_location: string | null;
          updated_at: string;
        };
        Insert: {
          active_rider_id?: string | null;
          battery_status?: string;
          color?: string | null;
          created_at?: string;
          current_battery_id?: string | null;
          device_status?: string;
          estimated_range_km: number;
          frame_number?: string | null;
          id: string;
          model: string;
          image_url?: string | null;
          ride_class?: string | null;
          top_speed_kmh: number;
          pricing_label: string;
          qr_code?: string | null;
          rate_per_minute?: number;
          status?: "available" | "reserved" | "in_use" | "maintenance";
          location: string;
          latitude: number;
          longitude: number;
          last_reported_at?: string;
          maintenance_summary?: string | null;
          serial_number?: string | null;
          station_id?: string | null;
          active_ride_started_at?: string | null;
          active_ride_start_location?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bikes"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          first_name: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          is_admin: boolean;
          user_type: string;
          user_status: string;
          registration_date: string;
          consent_agreed: boolean;
          consent_agreed_at: string | null;
          membership_id: string | null;
          identity_verification_status: string;
          student_status: boolean;
          driver_license_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          is_admin?: boolean;
          user_type?: string;
          user_status?: string;
          registration_date?: string;
          consent_agreed?: boolean;
          consent_agreed_at?: string | null;
          membership_id?: string | null;
          identity_verification_status?: string;
          student_status?: boolean;
          driver_license_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          is_admin?: boolean;
          user_type?: string;
          user_status?: string;
          registration_date?: string;
          consent_agreed?: boolean;
          consent_agreed_at?: string | null;
          membership_id?: string | null;
          identity_verification_status?: string;
          student_status?: boolean;
          driver_license_reference?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          id: string;
          profile_id: string;
          staff_name: string;
          role: string;
          permissions: Json;
          station_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          staff_name: string;
          role: string;
          permissions?: Json;
          station_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_profiles"]["Insert"]>;
        Relationships: [];
      };
      stations: {
        Row: {
          id: string;
          station_code: string | null;
          station_name: string;
          location_text: string | null;
          latitude: number | null;
          longitude: number | null;
          station_type: string;
          capacity: number;
          charging_slot_count: number;
          operating_status: string;
          electricity_status: string;
          power_capacity_kw: number | null;
          equipment_inventory: Json;
          phase_balance: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          station_code?: string | null;
          station_name: string;
          location_text?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          station_type?: string;
          capacity?: number;
          charging_slot_count?: number;
          operating_status?: string;
          electricity_status?: string;
          power_capacity_kw?: number | null;
          equipment_inventory?: Json;
          phase_balance?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stations"]["Insert"]>;
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          type: string;
          title: string;
          subtitle: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          type: string;
          title: string;
          subtitle: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          type?: string;
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
