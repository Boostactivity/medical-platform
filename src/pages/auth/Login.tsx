/**
 * PAGE LOGIN - Connexion utilisateur avec support MFA
 *
 * Design : Medical Clean (Apple Health-inspired)
 * Fonctionnalites :
 * - Connexion Email/Password
 * - Magic Link (connexion sans mot de passe)
 * - MFA Challenge apres authentification primaire
 * - Lien vers recuperation de mot de passe
 * - Lien vers inscription
 */

import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Sparkles, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { MFAChallenge } from '../../components/security/MFASetup'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showMfaChallenge, setShowMfaChallenge] = useState(false)

  const { signIn, signInWithMagicLink, completeMfaChallenge } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Recuperer l'URL de redirection apres connexion
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  // Connexion classique
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error, needsMfa } = await signIn(email, password)

    if (!error) {
      if (needsMfa) {
        // User has MFA enabled - show challenge
        setShowMfaChallenge(true)
      } else {
        navigate(from, { replace: true })
      }
    }

    setLoading(false)
  }

  // MFA challenge completed
  const handleMfaSuccess = () => {
    completeMfaChallenge()
    setShowMfaChallenge(false)
    navigate(from, { replace: true })
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

  // Show MFA challenge screen
  if (showMfaChallenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-2">
              Verification en deux etapes
            </h1>
            <p className="text-[#86868B]">
              Entrez le code de votre application d'authentification
            </p>
          </div>
          <MFAChallenge onSuccess={handleMfaSuccess} />
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowMfaChallenge(false)}
              className="text-sm text-[#86868B] hover:text-[#007AFF] transition-colors"
            >
              Retour a la connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-3xl">M</span>
            </div>
          </Link>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
            Bienvenue sur la plateforme
          </h1>
          <p className="text-[#86868B]">
            Connectez-vous pour acceder a votre espace
          </p>
        </div>

        {/* Card de connexion */}
        <Card className="border-[#D2D2D7] shadow-xl">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Choisissez votre methode de connexion
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
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
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
                        Mot de passe oublie ?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="--------"
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
                      <h3 className="font-semibold text-lg mb-2">Email envoye !</h3>
                      <p className="text-sm text-muted-foreground">
                        Verifiez votre boite email et cliquez sur le lien pour vous connecter.
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
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
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
                        Un lien de connexion securise sera envoye a cette adresse
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

        {/* Liens supplementaires */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-[#86868B]">
            Pas encore de compte ?{' '}
            <Link to="/contact" className="text-[#007AFF] hover:underline font-medium">
              Creer un compte
            </Link>
          </p>
          <p className="text-sm text-[#86868B]">
            <Link to="/" className="text-[#007AFF] hover:underline">
              Retour a l'accueil
            </Link>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#86868B]">
            Donnees de sante securisees - Hebergement certifie HDS
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
