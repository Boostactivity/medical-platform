/**
 * PAGE LOGIN - Connexion utilisateur
 * 
 * Design : Medical Clean (Apple Health-inspired)
 * Fonctionnalités :
 * - Connexion Email/Password
 * - Magic Link (connexion sans mot de passe)
 * - Lien vers récupération de mot de passe
 * - Lien vers inscription
 */

import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  
  const { signIn, signInWithMagicLink } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Récupérer l'URL de redirection après connexion
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  // Connexion classique
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)
    
    if (!error) {
      navigate(from, { replace: true })
    }
    
    setLoading(false)
  }

  // Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signInWithMagicLink(email)
    
    if (!error) {
      setMagicLinkSent(true)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-3xl">M</span>
            </div>
          </Link>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] mb-2">
            Bienvenue sur Medical
          </h1>
          <p className="text-[#5C5C5C]">
            Connectez-vous pour accéder à votre espace
          </p>
        </div>

        {/* Card de connexion */}
        <Card className="border-[#D9D5CC] shadow-xl">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Choisissez votre méthode de connexion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">
                  <Lock className="w-4 h-4 mr-2" />
                  Mot de passe
                </TabsTrigger>
                <TabsTrigger value="magic">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Magic Link
                </TabsTrigger>
              </TabsList>

              {/* Onglet Mot de passe */}
              <TabsContent value="password">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C5C]" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.fr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Link 
                        to="/auth/forgot-password"
                        className="text-sm text-[#007AFF] hover:underline"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C5C]" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>Connexion en cours...</>
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Onglet Magic Link */}
              <TabsContent value="magic">
                {magicLinkSent ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Email envoyé !</h3>
                      <p className="text-sm text-muted-foreground">
                        Vérifiez votre boîte email et cliquez sur le lien pour vous connecter.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setMagicLinkSent(false)}
                    >
                      Renvoyer un email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C5C]" />
                        <Input
                          id="magic-email"
                          type="email"
                          placeholder="votre@email.fr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                          autoComplete="email"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Un lien de connexion sécurisé sera envoyé à cette adresse
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? (
                        <>Envoi en cours...</>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Envoyer le Magic Link
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Liens supplémentaires */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-[#5C5C5C]">
            Pas encore de compte ?{' '}
            <Link to="/auth/signup" className="text-[#007AFF] hover:underline font-medium">
              Créer un compte
            </Link>
          </p>
          <p className="text-sm text-[#5C5C5C]">
            <Link to="/" className="text-[#007AFF] hover:underline">
              ← Retour à l'accueil
            </Link>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5C5C5C]">
            Données de santé sécurisées - Hébergement certifié HDS
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
