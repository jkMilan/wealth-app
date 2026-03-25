import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// This tells Supabase to securely save the login session on the iPhone
const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const supabaseUrl = 'https://prcfubxckwsupvcusolf.supabase.co';
const supabaseAnonKey = 'sb_publishable_YgtAgV8kBbF3eYix0g58yg_H1xtmcQ7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});