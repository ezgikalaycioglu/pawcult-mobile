import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
};

const listUserPhotoPaths = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
) => {
  const paths: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from('pet-photos')
      .list(userId, {
        limit,
        offset,
      });

    if (error) {
      throw error;
    }

    const files = data ?? [];
    paths.push(
      ...files
        .filter((file) => file.id !== null)
        .map((file) => `${userId}/${file.name}`)
    );

    if (files.length < limit) {
      break;
    }

    offset += limit;
  }

  return paths;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'method_not_allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SECRET_KEY');

    if (!serviceRoleKey) {
      throw new Error('Missing Supabase service role key.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { error: 'not_authenticated' },
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(jwt);

    if (userError || !userData.user) {
      return Response.json(
        { error: 'not_authenticated' },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = userData.user.id;
    const photoPaths = await listUserPhotoPaths(supabaseAdmin, userId);

    if (photoPaths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage
        .from('pet-photos')
        .remove(photoPaths);

      if (removeError) {
        throw removeError;
      }
    }

    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to delete account.';

    return Response.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
});
