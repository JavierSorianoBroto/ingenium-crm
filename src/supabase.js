import { createClient } from '@supabase/supabase-js'

// Prefer Vite env vars (set these in Vercel as VITE_SUPABASE_URL / VITE_SUPABASE_KEY).
// Fall back to the existing values for local development if env vars are not provided.
const DEFAULT_URL = 'https://cdvcooucmnpprqfgaluz.supabase.co'
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdmNvb3VjbW5wcHJxZmdhbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMyMjcsImV4cCI6MjA5MDAyOTIyN30.sJ5ysVx0kTHZ9Lv8ySqIpVfOJrhWY2NvBkBXodXKuhY'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || DEFAULT_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
