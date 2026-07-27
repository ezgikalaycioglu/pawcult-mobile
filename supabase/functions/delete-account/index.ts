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

const getSupabaseSecretKey = () => {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (secretKeys) {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    const defaultKey = parsed.default;

    if (defaultKey) {
      return defaultKey;
    }
  }

  return (
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY')
  );
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
    const serviceRoleKey = getSupabaseSecretKey();

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

    const { error: deleteInvitesError } = await supabaseAdmin
      .from('pet_owner_invites')
      .delete()
      .eq('invited_by_user_id', userId);

    if (deleteInvitesError) {
      throw deleteInvitesError;
    }

    const { error: updatePetOwnersError } = await supabaseAdmin
      .from('pet_owners')
      .update({ invited_by_user_id: null })
      .eq('invited_by_user_id', userId);

    if (updatePetOwnersError) {
      throw updatePetOwnersError;
    }

    const { error: updatePetProfilesError } = await supabaseAdmin
      .from('pet_profiles')
      .update({ created_by_user_id: null })
      .eq('created_by_user_id', userId);

    if (updatePetProfilesError) {
      throw updatePetProfilesError;
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
