import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqvtktnczmidbvmplvpc.supabase.co';
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxdnRrdG5jem1pZGJ2bXBsdnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MjUxNzUsImV4cCI6MjA2MDIwMTE3NX0.GSdkQG76fTK5-jJ6aVGYz0D3azR0nzsRDheHv3SHVGc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper function to get path for user uploads
export const getUserStoragePath = async (folder) => {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error('User not authenticated');
  return `${data.user.id}/${folder}`;
};