/**
 * ═══════════════════════════════════════════════════════════════════
 * PRO SANTÉ CONNECT - AUTHENTIFICATION OAUTH2
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Permet aux médecins de se connecter via Pro Santé Connect (ANS)
 * Protocole : OAuth2 / OpenID Connect
 * 
 * URLs Pro Santé Connect :
 * - TEST/BAC À SABLE : https://wallet.bas.psc.esante.gouv.fr
 * - PRODUCTION : https://wallet.esw.esante.gouv.fr
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const pscRoutes = new Hono();

// Configuration PSC (Bac à sable par défaut)
const PSC_BASE_URL = Deno.env.get('PSC_ENVIRONMENT') === 'production'
  ? 'https://wallet.esw.esante.gouv.fr'
  : 'https://wallet.bas.psc.esante.gouv.fr';

const PSC_AUTH_URL = `${PSC_BASE_URL}/auth/realms/esante-wallet/protocol/openid-connect/auth`;
const PSC_TOKEN_URL = `${PSC_BASE_URL}/auth/realms/esante-wallet/protocol/openid-connect/token`;
const PSC_USERINFO_URL = `${PSC_BASE_URL}/auth/realms/esante-wallet/protocol/openid-connect/userinfo`;

/**
 * ═══════════════════════════════════════════════════════════════════
 * ROUTE 1 : INITIER LA CONNEXION PSC
 * ═══════════════════════════════════════════════════════════════════
 * 
 * GET /auth/psc/login
 * Redirige le médecin vers Pro Santé Connect pour s'authentifier
 */
pscRoutes.get('/login', async (c) => {
  try {
    const clientId = Deno.env.get('PSC_CLIENT_ID');
    const redirectUri = Deno.env.get('PSC_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return c.json({
        error: 'Configuration PSC manquante',
        message: 'Veuillez configurer PSC_CLIENT_ID et PSC_REDIRECT_URI dans les secrets Supabase',
      }, 500);
    }

    // Générer state aléatoire (sécurité CSRF)
    const state = crypto.randomUUID();

    // Générer nonce (sécurité replay attack)
    const nonce = crypto.randomUUID();

    // Stocker state et nonce temporairement (30min)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('kv_store_50732e52').insert({
      key: `psc_state:${state}`,
      value: JSON.stringify({ nonce, created_at: new Date().toISOString() }),
    });

    // Construire URL d'authentification PSC
    const authUrl = new URL(PSC_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid scope_all'); // scope_all = RPPS + infos métier
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('acr_values', 'eidas1'); // Niveau de garantie

    console.log('[PSC Login] Redirecting to:', authUrl.toString());

    // Rediriger vers PSC
    return c.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('[PSC Login] Error:', error);
    return c.json({
      error: 'Erreur lors de la redirection PSC',
      message: error.message,
    }, 500);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * ROUTE 2 : CALLBACK PSC (après authentification)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * GET /auth/psc/callback?code=xxx&state=yyy
 * Reçoit le code d'autorisation de PSC et crée la session
 */
pscRoutes.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    // Vérifier si PSC a retourné une erreur
    if (error) {
      console.error('[PSC Callback] PSC returned error:', error);
      return c.redirect(`/login-medecin?error=psc_auth_failed&details=${error}`);
    }

    // Vérifier présence du code et state
    if (!code || !state) {
      console.error('[PSC Callback] Missing code or state');
      return c.redirect('/login-medecin?error=missing_params');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier state (protection CSRF)
    const { data: stateData, error: stateError } = await supabase
      .from('kv_store_50732e52')
      .select('value')
      .eq('key', `psc_state:${state}`)
      .single();

    if (stateError || !stateData) {
      console.error('[PSC Callback] Invalid state:', state);
      return c.redirect('/login-medecin?error=invalid_state');
    }

    const { nonce } = JSON.parse(stateData.value);

    // Supprimer le state utilisé
    await supabase.from('kv_store_50732e52').delete().eq('key', `psc_state:${state}`);

    // Échanger le code contre un access_token
    const tokenResponse = await exchangeCodeForTokens(code);

    if (!tokenResponse.id_token) {
      console.error('[PSC Callback] No id_token received');
      return c.redirect('/login-medecin?error=no_token');
    }

    // Décoder et valider l'id_token (JWT)
    const doctorInfo = await decodeAndValidateIdToken(tokenResponse.id_token, nonce);

    console.log('[PSC Callback] Doctor authenticated:', {
      rpps: doctorInfo.rpps,
      name: doctorInfo.fullName,
      email: doctorInfo.email,
    });

    // Créer ou mettre à jour le médecin dans Supabase
    const userId = await createOrUpdateDoctor(doctorInfo, supabase);

    // Créer une session Supabase Auth
    const sessionToken = await createSupabaseSession(userId, doctorInfo.email, supabase);

    // Rediriger vers le portail médecin avec le token de session
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/portail-medecin?session=${sessionToken}`);
  } catch (error: any) {
    console.error('[PSC Callback] Error:', error);
    return c.redirect(`/login-medecin?error=callback_failed&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * FONCTION : ÉCHANGER CODE CONTRE TOKENS
 * ═══════════════════════════════════════════════════════════════════
 */
async function exchangeCodeForTokens(code: string): Promise<any> {
  const clientId = Deno.env.get('PSC_CLIENT_ID');
  const clientSecret = Deno.env.get('PSC_CLIENT_SECRET');
  const redirectUri = Deno.env.get('PSC_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('PSC credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  console.log('[PSC Token] Exchanging code for tokens...');

  const response = await fetch(PSC_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[PSC Token] Token exchange failed:', errorText);
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const tokens = await response.json();
  console.log('[PSC Token] Tokens received successfully');

  return tokens;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * FONCTION : DÉCODER ET VALIDER ID_TOKEN
 * ═══════════════════════════════════════════════════════════════════
 */
async function decodeAndValidateIdToken(idToken: string, expectedNonce: string): Promise<any> {
  // Décoder le JWT (format : header.payload.signature)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // Décoder la partie payload (base64url)
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

  console.log('[PSC Token] ID Token payload:', payload);

  // Vérifier nonce (sécurité)
  if (payload.nonce !== expectedNonce) {
    throw new Error('Invalid nonce in id_token');
  }

  // Vérifier expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('id_token expired');
  }

  // Extraire informations du médecin
  return {
    pscSub: payload.SubjectNameID || payload.sub, // Identifiant unique PSC (RPPS généralement)
    rpps: payload.SubjectNameID, // Numéro RPPS
    firstName: payload.given_name || '',
    lastName: payload.family_name || '',
    fullName: `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
    email: payload.email || null,
    profession: payload.SubjectRole || 'Médecin',
    speciality: extractSpeciality(payload.Exercice_id),
    rawPayload: payload,
  };
}

/**
 * Extrait la spécialité depuis Exercice_id
 * Format : "10|SM54|60|..." où SM54 = code spécialité
 */
function extractSpeciality(exerciceId?: string): string {
  if (!exerciceId) return 'Non spécifié';

  const parts = exerciceId.split('|');
  if (parts.length < 2) return 'Non spécifié';

  const specialityCode = parts[1];

  // Mapping codes PSC → noms (liste partielle, à compléter)
  const specialities: Record<string, string> = {
    'SM54': 'Médecin généraliste',
    'SM26': 'Pneumologue',
    'SM04': 'Neurologue',
    'SM10': 'Cardiologue',
    'SM32': 'ORL',
    'SM02': 'Anesthésiste',
  };

  return specialities[specialityCode] || `Spécialité ${specialityCode}`;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * FONCTION : CRÉER OU METTRE À JOUR LE MÉDECIN
 * ═══════════════════════════════════════════════════════════════════
 */
async function createOrUpdateDoctor(doctorInfo: any, supabase: any): Promise<string> {
  // Vérifier si le médecin existe déjà (via RPPS)
  const { data: existingUser, error: searchError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('rpps_number', doctorInfo.rpps)
    .eq('role', 'doctor')
    .maybeSingle();

  if (searchError) {
    console.error('[Create Doctor] Search error:', searchError);
    throw new Error('Database error during doctor lookup');
  }

  if (existingUser) {
    // Médecin existant : mise à jour des infos
    console.log('[Create Doctor] Updating existing doctor:', existingUser.id);

    await supabase.from('profiles').update({
      first_name: doctorInfo.firstName,
      last_name: doctorInfo.lastName,
      psc_sub: doctorInfo.pscSub,
      speciality: doctorInfo.speciality,
      last_login_at: new Date().toISOString(),
      last_login_method: 'psc',
    }).eq('id', existingUser.id);

    return existingUser.id;
  } else {
    // Nouveau médecin : création
    console.log('[Create Doctor] Creating new doctor with RPPS:', doctorInfo.rpps);

    // Créer user dans Supabase Auth (sans mot de passe)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: doctorInfo.email || `${doctorInfo.rpps}@psc.medical-sante.fr`,
      email_confirm: true,
      user_metadata: {
        first_name: doctorInfo.firstName,
        last_name: doctorInfo.lastName,
        rpps: doctorInfo.rpps,
        role: 'doctor',
        auth_method: 'psc',
      },
    });

    if (authError) {
      console.error('[Create Doctor] Auth creation error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    // Créer profil dans profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      email: doctorInfo.email || `${doctorInfo.rpps}@psc.medical-sante.fr`,
      first_name: doctorInfo.firstName,
      last_name: doctorInfo.lastName,
      role: 'doctor',
      rpps_number: doctorInfo.rpps,
      psc_sub: doctorInfo.pscSub,
      speciality: doctorInfo.speciality,
      last_login_at: new Date().toISOString(),
      last_login_method: 'psc',
    });

    if (profileError) {
      console.error('[Create Doctor] Profile creation error:', profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log('[Create Doctor] New doctor created successfully:', authUser.user.id);
    return authUser.user.id;
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * FONCTION : CRÉER SESSION SUPABASE
 * ═══════════════════════════════════════════════════════════════════
 */
async function createSupabaseSession(userId: string, email: string, supabase: any): Promise<string> {
  // Générer un token de session sécurisé
  const sessionToken = crypto.randomUUID();

  // Stocker dans kv_store (expire après 24h)
  await supabase.from('kv_store_50732e52').insert({
    key: `psc_session:${sessionToken}`,
    value: JSON.stringify({
      userId,
      email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  console.log('[Create Session] Session created for user:', userId);
  return sessionToken;
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * ROUTE 3 : VALIDER SESSION PSC (pour le frontend)
 * ═══════════════════════════════════════════════════════════════════
 */
pscRoutes.get('/validate-session', async (c) => {
  try {
    const sessionToken = c.req.query('token');

    if (!sessionToken) {
      return c.json({ valid: false, error: 'No token provided' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('kv_store_50732e52')
      .select('value')
      .eq('key', `psc_session:${sessionToken}`)
      .single();

    if (error || !data) {
      return c.json({ valid: false, error: 'Invalid or expired token' }, 401);
    }

    const sessionData = JSON.parse(data.value);

    // Vérifier expiration
    if (new Date(sessionData.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'Session expired' }, 401);
    }

    // Générer vrai access token Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: sessionData.email,
    });

    if (authError || !authData) {
      return c.json({ valid: false, error: 'Failed to generate auth token' }, 500);
    }

    return c.json({
      valid: true,
      userId: sessionData.userId,
      email: sessionData.email,
      accessToken: authData.properties.action_link, // Token pour se connecter
    });
  } catch (error: any) {
    console.error('[Validate Session] Error:', error);
    return c.json({ valid: false, error: error.message }, 500);
  }
});

export default pscRoutes;
