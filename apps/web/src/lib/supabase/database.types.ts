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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      battery_charging_logs: {
        Row: {
          battery_id: string
          charge_cycles: number | null
          charging_slot_id: string | null
          completed_at: string | null
          created_at: string
          current_amp: number | null
          id: string
          metadata: Json
          source_system: string
          started_at: string
          state_of_health: number | null
          station_id: string | null
          status: string
          swap_from_battery_id: string | null
          swap_to_battery_id: string | null
          temperature_c: number | null
          voltage: number | null
        }
        Insert: {
          battery_id: string
          charge_cycles?: number | null
          charging_slot_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_amp?: number | null
          id?: string
          metadata?: Json
          source_system?: string
          started_at?: string
          state_of_health?: number | null
          station_id?: string | null
          status?: string
          swap_from_battery_id?: string | null
          swap_to_battery_id?: string | null
          temperature_c?: number | null
          voltage?: number | null
        }
        Update: {
          battery_id?: string
          charge_cycles?: number | null
          charging_slot_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_amp?: number | null
          id?: string
          metadata?: Json
          source_system?: string
          started_at?: string
          state_of_health?: number | null
          station_id?: string | null
          status?: string
          swap_from_battery_id?: string | null
          swap_to_battery_id?: string | null
          temperature_c?: number | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "battery_charging_logs_battery_id_fkey"
            columns: ["battery_id"]
            isOneToOne: false
            referencedRelation: "batteries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battery_charging_logs_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battery_charging_logs_swap_from_battery_id_fkey"
            columns: ["swap_from_battery_id"]
            isOneToOne: false
            referencedRelation: "batteries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battery_charging_logs_swap_to_battery_id_fkey"
            columns: ["swap_to_battery_id"]
            isOneToOne: false
            referencedRelation: "batteries"
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
          ride_sharing_session_id: string | null
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
          ride_sharing_session_id?: string | null
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
          ride_sharing_session_id?: string | null
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
            foreignKeyName: "bike_ride_history_ride_sharing_session_id_fkey"
            columns: ["ride_sharing_session_id"]
            isOneToOne: false
            referencedRelation: "ride_sharing_sessions"
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
      energy_management: {
        Row: {
          applied_tou_rate: number | null
          created_at: string
          currency_code: string
          id: string
          metadata: Json
          phase_l1_kw: number | null
          phase_l2_kw: number | null
          phase_l3_kw: number | null
          recorded_at: string
          source_system: string
          station_id: string | null
          total_power_demand_kw: number | null
          tou_rate_period: string | null
        }
        Insert: {
          applied_tou_rate?: number | null
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json
          phase_l1_kw?: number | null
          phase_l2_kw?: number | null
          phase_l3_kw?: number | null
          recorded_at?: string
          source_system?: string
          station_id?: string | null
          total_power_demand_kw?: number | null
          tou_rate_period?: string | null
        }
        Update: {
          applied_tou_rate?: number | null
          created_at?: string
          currency_code?: string
          id?: string
          metadata?: Json
          phase_l1_kw?: number | null
          phase_l2_kw?: number | null
          phase_l3_kw?: number | null
          recorded_at?: string
          source_system?: string
          station_id?: string | null
          total_power_demand_kw?: number | null
          tou_rate_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_management_station_id_fkey"
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
      operational_events: {
        Row: {
          bike_id: string | null
          created_at: string
          event_type: string
          gps_location: unknown
          id: string
          metadata: Json
          photo_proof_url: string | null
          profile_id: string | null
          rental_transaction_id: string | null
          staff_id: string | null
        }
        Insert: {
          bike_id?: string | null
          created_at?: string
          event_type: string
          gps_location?: unknown
          id?: string
          metadata?: Json
          photo_proof_url?: string | null
          profile_id?: string | null
          rental_transaction_id?: string | null
          staff_id?: string | null
        }
        Update: {
          bike_id?: string | null
          created_at?: string
          event_type?: string
          gps_location?: unknown
          id?: string
          metadata?: Json
          photo_proof_url?: string | null
          profile_id?: string | null
          rental_transaction_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_events_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_events_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: false
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_reports: {
        Row: {
          app_availability_rate: number | null
          created_at: string
          daily_revenue: number | null
          generated_at: string
          generated_by_profile_id: string | null
          id: string
          payment_reconciliation: Json
          period_end: string
          period_start: string
          report_type: string
          service_downtime_minutes: number | null
          usage_statistics: Json
          user_satisfaction_score: number | null
          utilization_rate: number | null
        }
        Insert: {
          app_availability_rate?: number | null
          created_at?: string
          daily_revenue?: number | null
          generated_at?: string
          generated_by_profile_id?: string | null
          id?: string
          payment_reconciliation?: Json
          period_end: string
          period_start: string
          report_type: string
          service_downtime_minutes?: number | null
          usage_statistics?: Json
          user_satisfaction_score?: number | null
          utilization_rate?: number | null
        }
        Update: {
          app_availability_rate?: number | null
          created_at?: string
          daily_revenue?: number | null
          generated_at?: string
          generated_by_profile_id?: string | null
          id?: string
          payment_reconciliation?: Json
          period_end?: string
          period_start?: string
          report_type?: string
          service_downtime_minutes?: number | null
          usage_statistics?: Json
          user_satisfaction_score?: number | null
          utilization_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_reports_generated_by_profile_id_fkey"
            columns: ["generated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          ride_sharing_session_id: string | null
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
          ride_sharing_session_id?: string | null
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
          ride_sharing_session_id?: string | null
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
            foreignKeyName: "rental_transactions_ride_sharing_session_id_fkey"
            columns: ["ride_sharing_session_id"]
            isOneToOne: false
            referencedRelation: "ride_sharing_sessions"
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
      ride_sharing_participants: {
        Row: {
          created_at: string
          id: string
          invitation_channel: string | null
          invited_at: string | null
          joined_at: string | null
          left_at: string | null
          participant_role: string
          participant_status: string
          profile_id: string
          ride_sharing_session_id: string
          source_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_channel?: string | null
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          participant_role: string
          participant_status?: string
          profile_id: string
          ride_sharing_session_id: string
          source_system?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_channel?: string | null
          invited_at?: string | null
          joined_at?: string | null
          left_at?: string | null
          participant_role?: string
          participant_status?: string
          profile_id?: string
          ride_sharing_session_id?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_sharing_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_sharing_participants_ride_sharing_session_id_fkey"
            columns: ["ride_sharing_session_id"]
            isOneToOne: false
            referencedRelation: "ride_sharing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_sharing_sessions: {
        Row: {
          bike_id: string | null
          created_at: string
          ended_at: string | null
          host_profile_id: string | null
          id: string
          notes: string | null
          participant_limit: number
          rental_transaction_id: string | null
          session_state: string
          share_expires_at: string | null
          share_token: string
          source_system: string
          started_at: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          bike_id?: string | null
          created_at?: string
          ended_at?: string | null
          host_profile_id?: string | null
          id?: string
          notes?: string | null
          participant_limit?: number
          rental_transaction_id?: string | null
          session_state?: string
          share_expires_at?: string | null
          share_token?: string
          source_system?: string
          started_at?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          bike_id?: string | null
          created_at?: string
          ended_at?: string | null
          host_profile_id?: string | null
          id?: string
          notes?: string | null
          participant_limit?: number
          rental_transaction_id?: string | null
          session_state?: string
          share_expires_at?: string | null
          share_token?: string
          source_system?: string
          started_at?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_sharing_sessions_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_sharing_sessions_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_sharing_sessions_rental_transaction_id_fkey"
            columns: ["rental_transaction_id"]
            isOneToOne: true
            referencedRelation: "rental_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          boundary: unknown
          city_name: string
          created_at: string
          id: string
          status: string
          updated_at: string
          zone_code: string | null
          zone_name: string
          zone_type: string
        }
        Insert: {
          boundary: unknown
          city_name: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          zone_code?: string | null
          zone_name: string
          zone_type: string
        }
        Update: {
          boundary?: unknown
          city_name?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          zone_code?: string | null
          zone_name?: string
          zone_type?: string
        }
        Relationships: []
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
      sustainability_reporting: {
        Row: {
          calculation_method: string
          carbon_reduced_kg: number | null
          created_at: string
          emission_factor_kgco2_per_km: number | null
          energy_consumption_kwh: number | null
          estimated_distance_km: number | null
          fuel_savings_liters: number | null
          generated_at: string
          generated_by_profile_id: string | null
          id: string
          period_end: string
          period_start: string
          report_id: string | null
          total_travel_distance_km: number | null
          trip_count: number
        }
        Insert: {
          calculation_method?: string
          carbon_reduced_kg?: number | null
          created_at?: string
          emission_factor_kgco2_per_km?: number | null
          energy_consumption_kwh?: number | null
          estimated_distance_km?: number | null
          fuel_savings_liters?: number | null
          generated_at?: string
          generated_by_profile_id?: string | null
          id?: string
          period_end: string
          period_start: string
          report_id?: string | null
          total_travel_distance_km?: number | null
          trip_count?: number
        }
        Update: {
          calculation_method?: string
          carbon_reduced_kg?: number | null
          created_at?: string
          emission_factor_kgco2_per_km?: number | null
          energy_consumption_kwh?: number | null
          estimated_distance_km?: number | null
          fuel_savings_liters?: number | null
          generated_at?: string
          generated_by_profile_id?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_id?: string | null
          total_travel_distance_km?: number | null
          trip_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sustainability_reporting_generated_by_profile_id_fkey"
            columns: ["generated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sustainability_reporting_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "operational_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      tablet_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_identifier: string
          device_name: string | null
          device_status: string
          id: string
          last_seen_at: string | null
          metadata: Json
          registered_by_staff_id: string | null
          station_id: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_identifier: string
          device_name?: string | null
          device_status?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          registered_by_staff_id?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_identifier?: string
          device_name?: string | null
          device_status?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          registered_by_staff_id?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablet_devices_registered_by_staff_id_fkey"
            columns: ["registered_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_devices_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      tablet_sync_batches: {
        Row: {
          batch_status: string
          client_batch_id: string
          completed_at: string | null
          created_at: string
          device_id: string
          error_summary: string | null
          id: string
          received_at: string
          record_count: number
          request_payload: Json
          response_payload: Json
          staff_id: string | null
          station_id: string | null
          updated_at: string
        }
        Insert: {
          batch_status?: string
          client_batch_id: string
          completed_at?: string | null
          created_at?: string
          device_id: string
          error_summary?: string | null
          id?: string
          received_at?: string
          record_count?: number
          request_payload?: Json
          response_payload?: Json
          staff_id?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_status?: string
          client_batch_id?: string
          completed_at?: string | null
          created_at?: string
          device_id?: string
          error_summary?: string | null
          id?: string
          received_at?: string
          record_count?: number
          request_payload?: Json
          response_payload?: Json
          staff_id?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablet_sync_batches_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tablet_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_batches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_batches_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      tablet_sync_conflicts: {
        Row: {
          business_id: string | null
          conflict_status: string
          conflict_type: string
          created_at: string
          device_id: string | null
          id: string
          local_id: string
          local_payload: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by_staff_id: string | null
          server_payload: Json
          staff_id: string | null
          station_id: string | null
          sync_record_id: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          conflict_status?: string
          conflict_type: string
          created_at?: string
          device_id?: string | null
          id?: string
          local_id: string
          local_payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          server_payload?: Json
          staff_id?: string | null
          station_id?: string | null
          sync_record_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          conflict_status?: string
          conflict_type?: string
          created_at?: string
          device_id?: string | null
          id?: string
          local_id?: string
          local_payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          server_payload?: Json
          staff_id?: string | null
          station_id?: string | null
          sync_record_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablet_sync_conflicts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tablet_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_conflicts_resolved_by_staff_id_fkey"
            columns: ["resolved_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_conflicts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_conflicts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_conflicts_sync_record_id_fkey"
            columns: ["sync_record_id"]
            isOneToOne: false
            referencedRelation: "tablet_sync_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tablet_sync_records: {
        Row: {
          business_id: string | null
          created_at: string
          device_id: string
          id: string
          local_id: string
          record_type: string
          rejection_reason: string | null
          request_payload: Json
          response_payload: Json
          server_entity_id: string | null
          server_entity_table: string | null
          staff_id: string | null
          station_id: string | null
          sync_batch_id: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          local_id: string
          record_type: string
          rejection_reason?: string | null
          request_payload?: Json
          response_payload?: Json
          server_entity_id?: string | null
          server_entity_table?: string | null
          staff_id?: string | null
          station_id?: string | null
          sync_batch_id: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          local_id?: string
          record_type?: string
          rejection_reason?: string | null
          request_payload?: Json
          response_payload?: Json
          server_entity_id?: string | null
          server_entity_table?: string | null
          staff_id?: string | null
          station_id?: string | null
          sync_batch_id?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablet_sync_records_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tablet_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_records_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablet_sync_records_sync_batch_id_fkey"
            columns: ["sync_batch_id"]
            isOneToOne: false
            referencedRelation: "tablet_sync_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_engagement_aggregates: {
        Row: {
          calories_burned_total: number
          carbon_reduced_total_kg: number
          created_at: string
          distance_accumulated_km: number
          eco_points: number
          id: string
          last_updated: string
          profile_id: string
        }
        Insert: {
          calories_burned_total?: number
          carbon_reduced_total_kg?: number
          created_at?: string
          distance_accumulated_km?: number
          eco_points?: number
          id?: string
          last_updated?: string
          profile_id: string
        }
        Update: {
          calories_burned_total?: number
          carbon_reduced_total_kg?: number
          created_at?: string
          distance_accumulated_km?: number
          eco_points?: number
          id?: string
          last_updated?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_aggregates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      check_service_area: {
        Args: { p_latitude: number; p_longitude: number }
        Returns: {
          boundary: unknown
          city_name: string
          created_at: string
          id: string
          status: string
          updated_at: string
          zone_code: string | null
          zone_name: string
          zone_type: string
        }
        SetofOptions: {
          from: "*"
          to: "service_areas"
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
          ride_sharing_session_id: string | null
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
      generate_operational_report: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_report_type?: string
        }
        Returns: {
          app_availability_rate: number | null
          created_at: string
          daily_revenue: number | null
          generated_at: string
          generated_by_profile_id: string | null
          id: string
          payment_reconciliation: Json
          period_end: string
          period_start: string
          report_type: string
          service_downtime_minutes: number | null
          usage_statistics: Json
          user_satisfaction_score: number | null
          utilization_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "operational_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_sustainability_report: {
        Args: { p_period_end: string; p_period_start: string }
        Returns: {
          calculation_method: string
          carbon_reduced_kg: number | null
          created_at: string
          emission_factor_kgco2_per_km: number | null
          energy_consumption_kwh: number | null
          estimated_distance_km: number | null
          fuel_savings_liters: number | null
          generated_at: string
          generated_by_profile_id: string | null
          id: string
          period_end: string
          period_start: string
          report_id: string | null
          total_travel_distance_km: number | null
          trip_count: number
        }
        SetofOptions: {
          from: "*"
          to: "sustainability_reporting"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_user_engagement: {
        Args: { p_profile_id?: string }
        Returns: number
      }
      run_daily_reports: { Args: never; Returns: Json }
      update_bike_status_with_event: {
        Args: {
          p_active_ride_start_location?: string
          p_active_ride_started_at?: string
          p_active_rider_id?: string
          p_actor_id: string
          p_bike_id: string
          p_context: Json
          p_expected_active_rider_id?: string
          p_expected_status: Database["public"]["Enums"]["bike_status"]
          p_last_reported_at: string
          p_status: Database["public"]["Enums"]["bike_status"]
          p_transition_kind: string
        }
        Returns: {
          active_rider_id: string
          id: string
          status: Database["public"]["Enums"]["bike_status"]
        }[]
      }
    }
    Enums: {
      bike_status: "ready_to_rent" | "reserved" | "in_use" | "returned_pending_inspection" | "charging" | "maintenance_required" | "out_of_service"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bike_status: [
        "ready_to_rent",
        "reserved",
        "in_use",
        "returned_pending_inspection",
        "charging",
        "maintenance_required",
        "out_of_service"
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
