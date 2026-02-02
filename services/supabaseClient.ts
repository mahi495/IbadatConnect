import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vszxhavdcudlzcnxujul.supabase.co';
const supabaseKey = 'sb_publishable_gKgnN6ID0ERWTX3Hgs5Zeg_gz4qfdLf';

export const supabase = createClient(supabaseUrl, supabaseKey);