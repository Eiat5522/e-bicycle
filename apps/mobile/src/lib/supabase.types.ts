export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_inventory: {
        Row: {
          created_at: string
          id: string
          item_description: string
          maintenance_period: string | null
          minimum_threshold: number
          procurement_date: string | null
          quantity: number
          station_id: string | null
          stock_level: number
          updated_at: string
          warranty_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description: string
          maintenance_period?: string | null
          minimum_threshold?: number
          procurement_date?: string | null
          quantity?: number
          station_id?: string | null
          stock_level?: number
          updated_at?: string
          warranty_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string
          maintenance_period?: string | null
          minimum_threshold?: number
          procurement_date?: string | null
          quantity?: number
          station_id?: string | null
          stock_level?: number
          updated_at?: string
          warranty_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_inventory_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          attachment_type: string
          content_type: string | null
          created_at: string
          entity_id: string
          entity_table: string
          file_url: string
          id: string
          storage_bucket: string | null
          storage_path: string | null
          uploaded_by_profile_id: string | null
        }
        Insert: {
          attachment_type: string
          content_type?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          file_url: string
          id?: string
          storage_bucket?: string | null
          storage_path?: string | null
          uploaded_by_profile_id?: string | null
        }
        Update: {
          attachment_type?: string
          content_type?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          file_url?: string
          id?: string
          storage_bucket?: string | null
          storage_path?: string | null
          uploaded_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_profile_id_fkey"
            columns: ["uploaded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_performed: string
          actor_profile_id: string | null
          actor_staff_id: string | null
          created_at: string
          data_changed: Json
          device_location: string | null
          entity_id: string | null
          entity_table: string | null
          evidence_attachment_id: string | null
          id: string
          kpi_achievement: number | null
          user_role: string | null
        }
        Insert: {
          action_performed: string
          actor_profile_id?: string | null
          actor_staff_id?: string | null
          created_at?: string
          data_changed?: Json
          device_location?: string | null
          entity_id?: string | null
          entity_table?: string | null
          evidence_attachment_id?: string | null
          id?: string
          kpi_achievement?: number | null
          user_role?: string | null
        }
        Update: {
          action_performed?: string
          actor_profile_id?: string | null
          actor_staff_id?: string | null
          created_at?: string
          data_changed?: Json
          device_location?: string | null
          entity_id?: string | null
          entity_table?: string | null
          evidence_attachment_id?: string | null
          id?: string
          kpi_achievement?: number | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_evidence_attachment_id_fkey"
            columns: ["evidence_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      batteries: {
        Row: {
          abnormal_flag: boolean
          battery_code: string
          bike_id: string | null
          charge_cycles: number
          charge_level: number | null
          charging_slot_id: string | null
          created_at: string
          current_amp: number | null
          health_history: string | null
          id: string
          last_inspection_date: string | null
          retirement_plan: string | null
          state_of_health: number | null
          station_id: string | null
          status: string
          temperature_c: number | null
          updated_at: string
          voltage: number | null
        }
        Insert: {
          abnormal_flag?: boolean
          battery_code: string
          bike_id?: string | null
          charge_cycles?: number
          charge_level?: number | null
          charging_slot_id?: string | null
          created_at?: string
          current_amp?: number | null
          health_history?: string | null
          id?: string
          last_inspection_date?: string | null
          retirement_plan?: string | null
          state_of_health?: number | null
          station_id?: string | null
          status?: string
          temperature_c?: number | null
          updated_at?: string
          voltage?: number | null
        }
        Update: {
          abnormal_flag?: boolean
          battery_code?: string
          bike_id?: string | null
          charge_cycles?: number
          charge_level?: number | null
          charging_slot_id?: string | null
          created_at?: string
          current_amp?: number | null
          health_history?: string | null
          id?: string
          last_inspection_date?: string | null
          retirement_plan?: string | null
          state_of_health?: number | null
          station_id?: string | null
          status?: string
          temperature_c?: number | null
          updated_at?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batteries_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batteries_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_ride_history: {
        Row: {
          bike_id: string
          billable_minutes: number
          checkpoints: Json
          co2_saved_kg: number
          completed_at: string
          created_at: string
          currency_code: string
          distance_km: number
          duration_sec: number
          end_location: string
          fare_calculation_method: string
          id: string
          payment_label: string
          profile_id: string | null
          rate_per_minute: number
          route: Json
          route_label: string
          start_location: string
          started_at: string
          total_cost: number
          wallet_transaction_id: string | null
        }
        Insert: {
          bike_id: string
          billable_minutes?: number
          checkpoints?: Json
          co2_saved_kg?: number
          completed_at: string
          created_at?: string
          currency_code?: string
          distance_km: number
          duration_sec: number
          end_location: string
          fare_calculation_method?: string
          id?: string
          payment_label: string
          profile_id?: string | null
          rate_per_minute?: number
          route?: Json
          route_label: string
          start_location: string
          started_at: string
          total_cost: number
          wallet_transaction_id?: string | null
        }
        Update: {
          bike_id?: string
          billable_minutes?: number
          checkpoints?: Json
          co2_saved_kg?: number
          completed_at?: string
          created_at?: string
          currency_code?: string
          distance_km?: number
          duration_sec?: number
          end_location?: string
          fare_calculation_method?: string
          id?: string
          payment_label?: string
          profile_id?: string | null
          rate_per_minute?: number
          route?: Json
          route_label?: string
          start_location?: string
          started_at?: string
          total_cost?: number
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_ride_history_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_ride_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_ride_history_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_status_events: {
        Row: {
          actor_id: string
          bike_id: string
          context: Json
          created_at: string
          from_status: Database["public"]["Enums"]["bike_status"]
          id: string
          to_status: Database["public"]["Enums"]["bike_status"]
          transition_kind: string
        }
        Insert: {
          actor_id: string
          bike_id: string
          context?: Json
          created_at?: string
          from_status: Database["public"]["Enums"]["bike_status"]
          id?: string
          to_status: Database["public"]["Enums"]["bike_status"]
          transition_kind: string
        }
        Update: {
          actor_id?: string
          bike_id?: string
          context?: Json
          created_at?: string
          from_status?: Database["public"]["Enums"]["bike_status"]
          id?: string
          to_status?: Database["public"]["Enums"]["bike_status"]
          transition_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_status_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_status_events_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          active_ride_start_location: string | null
          active_ride_started_at: string | null
          active_rider_id: string | null
          battery_status: string
          color: string | null
          created_at: string
          current_battery_id: string | null
          device_status: string
          estimated_range_km: number
          frame_number: string | null
          id: string
          image_url: string | null
          last_reported_at: string
          latitude: number
          location: string
          longitude: number
          maintenance_summary: string | null
          model: string
          pricing_label: string
          qr_code: string | null
          rate_per_minute: number
          ride_class: string | null
          serial_number: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["bike_status"]
          top_speed_kmh: number
          updated_at: string
        }
        Insert: {
          active_ride_start_location?: string | null
          active_ride_started_at?: string | null
          active_rider_id?: string | null
          battery_status?: string
          color?: string | null
          created_at?: string
          current_battery_id?: string | null
          device_status?: string
          estimated_range_km: number
          frame_number?: string | null
          id: string
          image_url?: string | null
          last_reported_at?: string
          latitude: number
          location: string
          longitude: number
          maintenance_summary?: string | null
          model: string
          pricing_label: string
          qr_code?: string | null
          rate_per_minute?: number
          ride_class?: string | null
          serial_number?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["bike_status"]
          top_speed_kmh: number
          updated_at?: string
        }
        Update: {
          active_ride_start_location?: string | null
          active_ride_started_at?: string | null
          active_rider_id?: string | null
          battery_status?: string
          color?: string | null
          created_at?: string
          current_battery_id?: string | null
          device_status?: string
          estimated_range_km?: number
          frame_number?: string | null
          id?: string
          image_url?: string | null
          last_reported_at?: string
          latitude?: number
          location?: string
          longitude?: number
          maintenance_summary?: string | null
          model?: string
          pricing_label?: string
          qr_code?: string | null
          rate_per_minute?: number
          ride_class?: string | null
          serial_number?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["bike_status"]
          top_speed_kmh?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bikes_active_rider_id_fkey"
            columns: ["active_rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bikes_current_battery_id_fkey"
            columns: ["current_battery_id"]
            isOneToOne: false
            referencedRelation: "batteries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bikes_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_staff_id: string | null
          bike_id: string | null
          created_at: string
          description: string | null
          entered_by_staff_id: string | null
          fallback_form_id: string | null
          id: string
          import_batch_id: string | null
          incident_type: string
          profile_id: string | null
          reconciled_at: string | null
          rental_transaction_id: string | null
          resolution_status: string
          source_system: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          bike_id?: string | null
          created_at?: string
          description?: string | null
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          incident_type: string
          profile_id?: string | null
          reconciled_at?: string | null
          rental_transaction_id?: string | null
          resolution_status?: string
          source_system?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          bike_id?: string | null
          created_at?: string
          description?: string | null
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          incident_type?: string
          profile_id?: string | null
          reconciled_at?: string | null
          rental_transaction_id?: string | null
          resolution_status?: string
          source_system?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_entered_by_staff_id_fkey"
            columns: ["entered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: false
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          asset_id: string | null
          bike_id: string | null
          created_at: string
          date_finished: string | null
          date_reported: string
          entered_by_staff_id: string | null
          fallback_form_id: string | null
          id: string
          import_batch_id: string | null
          next_service_schedule: string | null
          parts_used: Json
          post_repair_status: string | null
          quality_check_status: string
          reconciled_at: string | null
          repair_type: string
          source_system: string
          status: string
          technician_staff_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          bike_id?: string | null
          created_at?: string
          date_finished?: string | null
          date_reported?: string
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          next_service_schedule?: string | null
          parts_used?: Json
          post_repair_status?: string | null
          quality_check_status?: string
          reconciled_at?: string | null
          repair_type: string
          source_system?: string
          status?: string
          technician_staff_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          bike_id?: string | null
          created_at?: string
          date_finished?: string | null
          date_reported?: string
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          next_service_schedule?: string | null
          parts_used?: Json
          post_repair_status?: string | null
          quality_check_status?: string
          reconciled_at?: string | null
          repair_type?: string
          source_system?: string
          status?: string
          technician_staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_entered_by_staff_id_fkey"
            columns: ["entered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_technician_staff_id_fkey"
            columns: ["technician_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coupon_id: string | null
          created_at: string
          currency_code: string
          entered_by_staff_id: string | null
          evidence_file_url: string | null
          fallback_form_id: string | null
          id: string
          import_batch_id: string | null
          payment_method: string
          payment_reference: string | null
          payment_status: string
          payment_time: string | null
          profile_id: string | null
          reconciled_at: string | null
          reconciliation_status: string
          rental_transaction_id: string | null
          source_system: string
          updated_at: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          coupon_id?: string | null
          created_at?: string
          currency_code?: string
          entered_by_staff_id?: string | null
          evidence_file_url?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          payment_method: string
          payment_reference?: string | null
          payment_status?: string
          payment_time?: string | null
          profile_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string
          rental_transaction_id?: string | null
          source_system?: string
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          coupon_id?: string | null
          created_at?: string
          currency_code?: string
          entered_by_staff_id?: string | null
          evidence_file_url?: string | null
          fallback_form_id?: string | null
          id?: string
          import_batch_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          payment_status?: string
          payment_time?: string | null
          profile_id?: string | null
          reconciled_at?: string | null
          reconciliation_status?: string
          rental_transaction_id?: string | null
          source_system?: string
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_entered_by_staff_id_fkey"
            columns: ["entered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: false
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_agreed: boolean
          consent_agreed_at: string | null
          created_at: string
          driver_license_reference: string | null
          email: string | null
          first_name: string
          full_name: string | null
          id: string
          identity_verification_status: string
          is_admin: boolean
          membership_id: string | null
          phone: string | null
          registration_date: string
          student_status: boolean
          updated_at: string
          user_status: string
          user_type: string
        }
        Insert: {
          consent_agreed?: boolean
          consent_agreed_at?: string | null
          created_at?: string
          driver_license_reference?: string | null
          email?: string | null
          first_name: string
          full_name?: string | null
          id: string
          identity_verification_status?: string
          is_admin?: boolean
          membership_id?: string | null
          phone?: string | null
          registration_date?: string
          student_status?: boolean
          updated_at?: string
          user_status?: string
          user_type?: string
        }
        Update: {
          consent_agreed?: boolean
          consent_agreed_at?: string | null
          created_at?: string
          driver_license_reference?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          identity_verification_status?: string
          is_admin?: boolean
          membership_id?: string | null
          phone?: string | null
          registration_date?: string
          student_status?: boolean
          updated_at?: string
          user_status?: string
          user_type?: string
        }
        Relationships: []
      }
      rental_transactions: {
        Row: {
          bike_id: string
          billable_minutes: number
          checkpoints: Json
          co2_saved_kg: number
          completed_at: string
          created_at: string
          currency_code: string
          distance_km: number
          duration_sec: number
          end_location: string
          entered_by_staff_id: string | null
          fallback_form_id: string | null
          fare_calculation_method: string
          id: string
          import_batch_id: string | null
          payment_id: string | null
          payment_label: string
          photo_evidence_url: string | null
          profile_id: string | null
          rate_per_minute: number
          reconciled_at: string | null
          rental_status: string
          return_station_id: string | null
          route: Json
          route_distance_km: number | null
          route_label: string
          service_fee: number | null
          source_system: string
          start_location: string
          start_station_id: string | null
          started_at: string
          total_cost: number
          wallet_transaction_id: string | null
        }
        Insert: {
          bike_id: string
          billable_minutes?: number
          checkpoints?: Json
          co2_saved_kg?: number
          completed_at: string
          created_at?: string
          currency_code?: string
          distance_km: number
          duration_sec: number
          end_location: string
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          fare_calculation_method?: string
          id?: string
          import_batch_id?: string | null
          payment_id?: string | null
          payment_label: string
          photo_evidence_url?: string | null
          profile_id?: string | null
          rate_per_minute?: number
          reconciled_at?: string | null
          rental_status?: string
          return_station_id?: string | null
          route?: Json
          route_distance_km?: number | null
          route_label: string
          service_fee?: number | null
          source_system?: string
          start_location: string
          start_station_id?: string | null
          started_at: string
          total_cost: number
          wallet_transaction_id?: string | null
        }
        Update: {
          bike_id?: string
          billable_minutes?: number
          checkpoints?: Json
          co2_saved_kg?: number
          completed_at?: string
          created_at?: string
          currency_code?: string
          distance_km?: number
          duration_sec?: number
          end_location?: string
          entered_by_staff_id?: string | null
          fallback_form_id?: string | null
          fare_calculation_method?: string
          id?: string
          import_batch_id?: string | null
          payment_id?: string | null
          payment_label?: string
          photo_evidence_url?: string | null
          profile_id?: string | null
          rate_per_minute?: number
          reconciled_at?: string | null
          rental_status?: string
          return_station_id?: string | null
          route?: Json
          route_distance_km?: number | null
          route_label?: string
          service_fee?: number | null
          source_system?: string
          start_location?: string
          start_station_id?: string | null
          started_at?: string
          total_cost?: number
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_transactions_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_entered_by_staff_id_fkey"
            columns: ["entered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_return_station_id_fkey"
            columns: ["return_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_start_station_id_fkey"
            columns: ["start_station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_milestones: {
        Row: {
          achieved_at: string
          created_at: string
          milestone_key: string
          points_awarded: number
          profile_id: string
          title: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          milestone_key: string
          points_awarded: number
          profile_id: string
          title: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          milestone_key?: string
          points_awarded?: number
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_milestones_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          profile_id: string
          role: string
          staff_name: string
          station_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          profile_id: string
          role: string
          staff_name: string
          station_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          profile_id?: string
          role?: string
          staff_name?: string
          station_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          capacity: number
          charging_slot_count: number
          created_at: string
          electricity_status: string
          equipment_inventory: Json
          id: string
          latitude: number | null
          location_text: string | null
          longitude: number | null
          operating_status: string
          phase_balance: Json
          power_capacity_kw: number | null
          station_code: string | null
          station_name: string
          station_type: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          charging_slot_count?: number
          created_at?: string
          electricity_status?: string
          equipment_inventory?: Json
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          operating_status?: string
          phase_balance?: Json
          power_capacity_kw?: number | null
          station_code?: string | null
          station_name: string
          station_type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          charging_slot_count?: number
          created_at?: string
          electricity_status?: string
          equipment_inventory?: Json
          id?: string
          latitude?: number | null
          location_text?: string | null
          longitude?: number | null
          operating_status?: string
          phase_balance?: Json
          power_capacity_kw?: number | null
          station_code?: string | null
          station_name?: string
          station_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          subtitle: string
          title: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          subtitle: string
          title: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          subtitle?: string
          title?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          payment_methods: string[]
          points: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id: string
          payment_methods?: string[]
          points?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          payment_methods?: string[]
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_wallet_top_up: {
        Args: { p_amount: number; p_subtitle: string; p_title: string }
        Returns: {
          balance: number
          created_at: string
          id: string
          payment_methods: string[]
          points: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_ride: {
        Args: {
          p_bike_id: string
          p_checkpoints?: Json
          p_co2_saved_kg?: number
          p_distance_km?: number
          p_end_location?: string
          p_route?: Json
          p_route_label?: string
        }
        Returns: {
          bike_id: string
          billable_minutes: number
          checkpoints: Json
          co2_saved_kg: number
          completed_at: string
          created_at: string
          currency_code: string
          distance_km: number
          duration_sec: number
          end_location: string
          fare_calculation_method: string
          id: string
          payment_label: string
          profile_id: string | null
          rate_per_minute: number
          route: Json
          route_label: string
          start_location: string
          started_at: string
          total_cost: number
          wallet_transaction_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bike_ride_history"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      bike_status: "available" | "reserved" | "in_use" | "maintenance"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export type BikeRow = Database["public"]["Tables"]["bikes"]["Row"]
export type BikeRideHistoryRow =
  Database["public"]["Tables"]["bike_ride_history"]["Row"]
export type BikeStatusEventRow =
  Database["public"]["Tables"]["bike_status_events"]["Row"]
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export const Constants = {
  public: {
    Enums: {
      bike_status: ["available", "reserved", "in_use", "maintenance"],
    },
  },
} as const
