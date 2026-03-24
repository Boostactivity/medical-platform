/**
 * INIT DEMO ACCOUNTS
 *
 * Utilise l'API Supabase Auth (cote client, anon key) pour creer
 * les comptes de demonstration via signUp / signInWithPassword.
 *
 * - Si le compte n'existe pas : signUp() le cree
 * - Si le compte existe deja  : signInWithPassword() pour verifier le mot de passe
 * - Cree / met a jour le profil dans public.profiles
 */

import { createClient } from './supabase/client';

export interface DemoAccount {
  email: string;
  password: string;
  role: string;
  nom: string;
  prenom: string;
}

export interface InitResult {
  email: string;
  status: 'created' | 'existing' | 'error';
  message: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'admin@medconnect.fr', password: 'Demo123!', role: 'admin', nom: 'Admin', prenom: 'System' },
  { email: 'dr.martin@medconnect.fr', password: 'Demo123!', role: 'medecin', nom: 'Martin', prenom: 'Sophie' },
  { email: 'dr.dupont@medconnect.fr', password: 'Demo123!', role: 'medecin', nom: 'Dupont', prenom: 'Marie' },
  { email: 'inf.leroy@medconnect.fr', password: 'Demo123!', role: 'infirmier', nom: 'Leroy', prenom: 'Sophie' },
  { email: 'tech.dupuis@medconnect.fr', password: 'Demo123!', role: 'prestataire', nom: 'Dupuis', prenom: 'Laurent' },
  { email: 'pierre.moreau@email.fr', password: 'Demo123!', role: 'patient', nom: 'Moreau', prenom: 'Pierre' },
  { email: 'anne.lambert@email.fr', password: 'Demo123!', role: 'patient', nom: 'Lambert', prenom: 'Anne' },
  { email: 'marc.petit@email.fr', password: 'Demo123!', role: 'patient', nom: 'Petit', prenom: 'Marc' },
];

/**
 * Upsert le profil dans public.profiles.
 * Tente d'abord un upsert ; si la table n'existe pas on log un warning.
 */
async function upsertProfile(
  userId: string,
  account: DemoAccount,
): Promise<void> {
  const supabase = createClient();

  const profileData = {
    id: userId,
    email: account.email,
    role: account.role,
    nom: account.nom,
    prenom: account.prenom,
    full_name: `${account.prenom} ${account.nom}`,
    updated_at: new Date().toISOString(),
  };

  // Try profiles table first
  const { error: profilesError } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' });

  if (profilesError) {
    // Maybe the table is named users_profile or users
    console.warn(`[initDemo] profiles upsert failed: ${profilesError.message}, trying users table...`);

    const { error: usersError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: account.email,
        role: account.role,
        name: `${account.prenom} ${account.nom}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (usersError) {
      console.warn(`[initDemo] users upsert also failed: ${usersError.message}`);
    }
  }
}

/**
 * Initialise un seul compte demo.
 */
export async function initSingleAccount(account: DemoAccount): Promise<InitResult> {
  const supabase = createClient();

  try {
    // 1) Tenter signUp
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          role: account.role,
          nom: account.nom,
          prenom: account.prenom,
          full_name: `${account.prenom} ${account.nom}`,
        },
      },
    });

    // signUp reussit et retourne un vrai user (pas fake / deja existant)
    if (!signUpError && signUpData.user && signUpData.user.identities && signUpData.user.identities.length > 0) {
      // Compte cree avec succes
      await upsertProfile(signUpData.user.id, account);

      // Se deconnecter pour ne pas rester connecte en tant que ce compte
      await supabase.auth.signOut();

      return {
        email: account.email,
        status: 'created',
        message: `Compte cree (${account.role})`,
      };
    }

    // 2) Le compte existe probablement deja -- tenter signIn pour verifier le mot de passe
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (signInError) {
      // Le mot de passe ne correspond pas, ou autre erreur
      return {
        email: account.email,
        status: 'error',
        message: `Compte existant mais login echoue : ${signInError.message}`,
      };
    }

    if (signInData.user) {
      // Mettre a jour le profil et les metadata
      await upsertProfile(signInData.user.id, account);

      // Mettre a jour user_metadata pour que le role soit correct
      await supabase.auth.updateUser({
        data: {
          role: account.role,
          nom: account.nom,
          prenom: account.prenom,
          full_name: `${account.prenom} ${account.nom}`,
        },
      });

      // Se deconnecter
      await supabase.auth.signOut();

      return {
        email: account.email,
        status: 'existing',
        message: `Compte existant, profil mis a jour (${account.role})`,
      };
    }

    return {
      email: account.email,
      status: 'error',
      message: 'Resultat inattendu lors du signUp/signIn',
    };
  } catch (err: any) {
    return {
      email: account.email,
      status: 'error',
      message: err?.message || 'Erreur inconnue',
    };
  }
}

/**
 * Initialise tous les comptes demo, un par un.
 * Appelle onProgress() apres chaque compte.
 */
export async function initAllDemoAccounts(
  onProgress?: (result: InitResult, index: number, total: number) => void,
): Promise<InitResult[]> {
  const results: InitResult[] = [];

  for (let i = 0; i < DEMO_ACCOUNTS.length; i++) {
    const account = DEMO_ACCOUNTS[i];
    const result = await initSingleAccount(account);
    results.push(result);
    onProgress?.(result, i, DEMO_ACCOUNTS.length);
  }

  return results;
}
