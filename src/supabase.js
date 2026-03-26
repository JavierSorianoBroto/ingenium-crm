import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cdvcooucmnpprqfgaluz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdmNvb3VjbW5wcHJxZmdhbHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTMyMjcsImV4cCI6MjA5MDAyOTIyN30.sJ5ysVx0kTHZ9Lv8ySqIpVfOJrhWY2NvBkBXodXKuhY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
