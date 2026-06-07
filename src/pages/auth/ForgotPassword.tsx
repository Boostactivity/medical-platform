/**
 * PAGE FORGOT PASSWORD - Récupération de mot de passe
 * 
 * Design : Medical Clean (Apple Health-inspired)
 * Fonctionnalités :
 * - Envoi d'un email de réinitialisation
 * - Retour vers la page de connexion
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(email)
    
    if (!error) {
      setEmailSent(true)
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
              <span className="text-white font-semibold text-3xl">E</span>
            </div>
          </Link>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-[#5C5C5C]">
            Entrez votre email pour réinitialiser votre mot de passe
          </p>
        </div>

        {/* Card de récupération */}
        <Card className="border-[#D9D5CC] shadow-xl">
          <CardHeader>
            <CardTitle>Réinitialisation</CardTitle>
            <CardDescription>
              Nous vous enverrons un lien de réinitialisation par email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Email envoyé !</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Un email de réinitialisation a été envoyé à{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vérifiez votre boîte de réception et vos spams
                  </p>
                </div>
                <div className="pt-4">
                  <Link to="/auth/login">
                    <Button className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Entrez l'email associé à votre compte
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
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer le lien de réinitialisation
                    </>
                  )}
                </Button>

                <div className="pt-4 text-center">
                  <Link 
                    to="/auth/login"
                    className="text-sm text-[#007AFF] hover:underline inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#5C5C5C]">
            Besoin d'aide ?{' '}
            <Link to="/contact" className="text-[#007AFF] hover:underline">
              Contactez notre support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
