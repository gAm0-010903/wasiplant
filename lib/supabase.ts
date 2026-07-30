import { createClient } from '@supabase/supabase-js'

// 1. Ponemos tu URL directamente (sacada de tu imagen anterior)
const supabaseUrl = 'https://cxzggnznwiopmgrdzwdp.supabase.co'

// 2. Reemplaza el texto de abajo con tu clave real (la súper larga que empieza con eyJ...)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4emdnbnpud2lvcG1ncmR6d2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MTEwMDYsImV4cCI6MjEwMDk4NzAwNn0.xjOITWcXsEO8jeRN7PnUQCgyS8GXEu96dJbrkY0T7-I'

export const supabase = createClient(supabaseUrl, supabaseKey)