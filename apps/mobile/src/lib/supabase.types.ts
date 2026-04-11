export interface Database {
  public: {
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
    };
  };
}

export interface Profile {
  readonly id: string;
  readonly firstName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
