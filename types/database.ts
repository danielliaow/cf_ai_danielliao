export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  google_refresh_token?: string;
  google_access_token?: string;
  google_token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}