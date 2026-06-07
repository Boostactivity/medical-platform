/**
 * Auth middlewares (Hono).
 * - requireAuth: validates the Bearer token and puts the Supabase user in context.
 * - requireRole(...roles): checks user_metadata.role against an allowlist.
 */

import type { Context, Next } from 'npm:hono';
import { supabase } from '../lib/supabase.ts';

/** Hono Env type for routes using these middlewares: new Hono<AuthEnv>() */
export type AuthEnv = {
  Variables: {
    user: any;
  };
};

export const requireAuth = async (c: Context<AuthEnv>, next: Next) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('user', user);
  await next();
};

export const requireRole = (...roles: string[]) => {
  return async (c: Context<AuthEnv>, next: Next) => {
    const user = c.get('user');
    const userRole = user?.user_metadata?.role;

    if (!userRole || !roles.includes(userRole)) {
      return c.json(
        { error: `Forbidden - Requires role: ${roles.join(' or ')}` },
        403
      );
    }

    await next();
  };
};
