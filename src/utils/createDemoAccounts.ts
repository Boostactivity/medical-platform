// Utility to create demo accounts
// This should be run once to populate the database with test accounts

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

const SUPABASE_URL = `https://${projectId}.supabase.co`;
const API_URL = `${SUPABASE_URL}/functions/v1/make-server-50732e52`;

export async function createDemoAccounts() {
  const demoAccounts = [
    {
      email: 'patient@demo.fr',
      password: 'demo123',
      name: 'Jean Dupont',
      role: 'patient',
    },
    {
      email: 'doctor@demo.fr',
      password: 'demo123',
      name: 'Dr. Martin',
      role: 'doctor',
      specialty: 'Pneumologie',
    },
    {
      email: 'admin@demo.fr',
      password: 'demo123',
      name: 'Admin Exp\'Air',
      role: 'admin',
    },
  ];

  console.log('Creating demo accounts...');

  for (const account of demoAccounts) {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(account),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created ${account.role}: ${account.email}`);
      } else {
        console.log(`⚠️  ${account.email} may already exist or error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${account.email}:`, error);
    }
  }

  console.log('\n✨ Demo accounts setup complete!');
  console.log('\nLogin credentials:');
  console.log('Patient: patient@demo.fr / demo123');
  console.log('Doctor: doctor@demo.fr / demo123');
  console.log('Admin: admin@demo.fr / demo123');
}

// Uncomment to run
// createDemoAccounts();