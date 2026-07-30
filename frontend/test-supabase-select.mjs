import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://bcacvqykauiahqohvhqj.supabase.co', 'sb_publishable_WjIGWYMZttbn22pAWDp1WQ_vO5nopaZ');
async function test() {
  const { data, error } = await supabase.from('offering_titles').select('*');
  console.log('Result:', { data, error });
}
test();
