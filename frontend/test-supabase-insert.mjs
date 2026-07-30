import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://bcacvqykauiahqohvhqj.supabase.co', 'sb_publishable_WjIGWYMZttbn22pAWDp1WQ_vO5nopaZ');
async function test() {
  const { data, error } = await supabase.from('offering_titles').insert([{ address: '0xabc', title: 'test_insert' }]);
  console.log('Result:', { data, error });
}
test();
