import { setupURLPolyfill } from 'react-native-url-polyfill';
setupURLPolyfill();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jfnuusbujagpbzunaomc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbnV1c2J1amFncGJ6dW5hb21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDUxNzUsImV4cCI6MjA5MzI4MTE3NX0.HA3q4S6oTtd2RAQuuHR5fYY9a0qAKz5yV05Ho-SDyMU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
