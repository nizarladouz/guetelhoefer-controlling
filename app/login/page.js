import { redirect } from 'next/navigation';
import { holeProfil } from '@/lib/supabase/server';
import LoginFormular from '@/components/LoginFormular';

export default async function LoginSeite() {
  if (await holeProfil()) redirect('/wochen');
  return <LoginFormular />;
}
