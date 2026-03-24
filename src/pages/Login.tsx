/**
 * PAGE DE CONNEXION GÉNÉRIQUE
 * Point d'entrée pour tous les utilisateurs (patient, médecin, admin)
 * Intègre Pro Santé Connect pour les médecins
 */

import React from 'react';
import { LoginForm } from '../components/LoginForm';
import { ProSanteConnect } from '../components/auth/ProSanteConnect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-semibold text-2xl">E</span>
          </div>
          <h1 className="text-slate-900 mb-2">Connexion la plateforme</h1>
          <p className="text-slate-600">Accédez à votre espace sécurisé</p>
        </div>

        {/* Tabs de connexion */}
        <Tabs defaultValue="patient" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="doctor">Médecin</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* Patient */}
          <TabsContent value="patient">
            <Card>
              <CardHeader>
                <CardTitle>Espace Patient</CardTitle>
                <CardDescription>
                  Consultez vos données de traitement et votre score la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm userType="patient" redirectTo="/dashboard-patient" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Médecin */}
          <TabsContent value="doctor">
            <Card>
              <CardHeader>
                <CardTitle>Espace Médecin</CardTitle>
                <CardDescription>
                  Suivez vos patients et analysez leurs données cliniques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bouton Pro Santé Connect */}
                <ProSanteConnect compact className="w-full" />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-slate-400">ou connexion classique</span>
                  </div>
                </div>

                <LoginForm userType="doctor" redirectTo="/dashboard-medecin" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Espace Administration</CardTitle>
                <CardDescription>
                  Gestion complète de la plateforme et des utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm userType="admin" redirectTo="/dashboard-admin" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Liens utiles */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <a href="/faq" className="hover:text-slate-700 underline">
            Problèmes de connexion ?
          </a>
          {' · '}
          <a href="/" className="hover:text-slate-700 underline">
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
