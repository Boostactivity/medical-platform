/**
 * SECURE INPUT COMPONENT
 * Package partagé entre Web & Mobile (futur monorepo)
 * 
 * Input sécurisé avec validation et sanitization automatiques
 */

import React, { useState, useCallback } from 'react';
import { guardInput } from '../../shared/security/input-guard';

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  type?: 'email' | 'phone' | 'name' | 'text' | 'numeric' | 'password';
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  showValidation?: boolean;
  required?: boolean;
  helperText?: string;
  errorClassName?: string;
  inputClassName?: string;
}

/**
 * Composant Input sécurisé avec validation intégrée
 * 
 * @example
 * ```tsx
 * <SecureInput
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={(val, isValid) => {
 *     setEmail(val);
 *     setIsEmailValid(isValid);
 *   }}
 *   showValidation
 *   required
 * />
 * ```
 */
export function SecureInput({
  label,
  type = 'text',
  value,
  onChange,
  showValidation = false,
  required = false,
  helperText,
  errorClassName = 'text-red-600 text-sm mt-1',
  inputClassName = '',
  ...props
}: SecureInputProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gérer le changement de valeur avec validation
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Valider et sanitizer
    const { valid, sanitized, error: validationError } = guardInput(rawValue, type);
    
    // Mettre à jour l'erreur
    if (touched && showValidation) {
      setError(validationError || null);
    }
    
    // Callback parent avec valeur sanitizée
    onChange(sanitized, valid);
  }, [type, touched, showValidation, onChange]);

  /**
   * Gérer le blur (perte de focus)
   */
  const handleBlur = useCallback(() => {
    setTouched(true);
    
    if (showValidation) {
      const { valid, error: validationError } = guardInput(value, type);
      
      if (!valid) {
        setError(validationError || null);
      } else if (required && value.trim() === '') {
        setError('Ce champ est requis');
      } else {
        setError(null);
      }
    }
  }, [value, type, showValidation, required]);

  /**
   * Classes CSS dynamiques
   */
  const baseInputClass = `
    w-full px-4 py-2 rounded-lg border transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${inputClassName}
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        {...props}
        type={type === 'password' ? 'password' : 'text'}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={baseInputClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
      
      {/* Helper text ou erreur */}
      {showValidation && error && touched && (
        <p id={`${props.id}-error`} className={errorClassName} role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-gray-500 text-sm mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Textarea sécurisé
 */
interface SecureTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  maxLength?: number;
  showValidation?: boolean;
  required?: boolean;
  helperText?: string;
  errorClassName?: string;
  textareaClassName?: string;
}

export function SecureTextarea({
  label,
  value,
  onChange,
  maxLength = 1000,
  showValidation = false,
  required = false,
  helperText,
  errorClassName = 'text-red-600 text-sm mt-1',
  textareaClassName = '',
  ...props
}: SecureTextareaProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    
    const { valid, sanitized, error: validationError } = guardInput(rawValue, 'text');
    
    if (touched && showValidation) {
      setError(validationError || null);
    }
    
    onChange(sanitized, valid);
  }, [touched, showValidation, onChange]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    
    if (showValidation) {
      const { valid, error: validationError } = guardInput(value, 'text');
      
      if (!valid) {
        setError(validationError || null);
      } else if (required && value.trim() === '') {
        setError('Ce champ est requis');
      } else {
        setError(null);
      }
    }
  }, [value, showValidation, required]);

  const baseTextareaClass = `
    w-full px-4 py-2 rounded-lg border transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${textareaClassName}
  `;

  const remainingChars = maxLength - value.length;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        {...props}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={maxLength}
        className={baseTextareaClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
      />
      
      {/* Compteur de caractères */}
      <div className="flex justify-between items-center mt-1">
        <div>
          {showValidation && error && touched && (
            <p id={`${props.id}-error`} className={errorClassName} role="alert">
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p className="text-gray-500 text-sm">
              {helperText}
            </p>
          )}
        </div>
        
        <p className="text-gray-400 text-sm">
          {remainingChars} / {maxLength}
        </p>
      </div>
    </div>
  );
}
