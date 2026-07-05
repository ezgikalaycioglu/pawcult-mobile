type SupabaseAuthRedirect = {
  accessToken: string | null;
  refreshToken: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  type: string | null;
};

export const SUPABASE_AUTH_REDIRECT_URL = 'pawcult://auth/callback';

const getParamsFromSegment = (segment: string | undefined) => {
  if (!segment) {
    return new URLSearchParams();
  }

  const normalized = segment.startsWith('?') || segment.startsWith('#')
    ? segment.slice(1)
    : segment;

  return new URLSearchParams(normalized);
};

export const parseSupabaseAuthRedirect = (url: string): SupabaseAuthRedirect => {
  const [beforeHash, hash = ''] = url.split('#');
  const [, query = ''] = beforeHash.split('?');

  const queryParams = getParamsFromSegment(query);
  const hashParams = getParamsFromSegment(hash);

  const getParam = (name: string) =>
    hashParams.get(name) ?? queryParams.get(name);

  return {
    accessToken: getParam('access_token'),
    refreshToken: getParam('refresh_token'),
    errorCode: getParam('error_code'),
    errorDescription: getParam('error_description'),
    type: getParam('type'),
  };
};
