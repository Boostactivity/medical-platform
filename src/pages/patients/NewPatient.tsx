/**
 * PHASE 3.8 - WIZARD D'ADMISSION PATIENT
 * Formulaire en 3 étapes : Identité → Médical (Ordonnance) → Matériel
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  FileText, 
  Package, 
  ChevronRight, 
  ChevronLeft,
  Upload,
  Check,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { createClient } from '../../utils/supabase/client';

interface PatientFormData {
  // Étape 1 - Identité
  first_name: string;
  last_name: string;
  nir: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  
  // Étape 2 - Médical
  prescribing_doctor: string;
  panel_code: string;
  ordonnance_file?: File;
  
  // Étape 3 - Matériel
  machine_type: string;
  mask_type: string;
  installation_date: string;
}

const MACHINE_TYPES = [
  { id: 'dreamstation', name: 'DreamStation 2', brand: 'Philips' },
  { id: 'airsense10', name: 'AirSense 10', brand: 'ResMed' },
  { id: 'prismax', name: 'Prisma 20A', brand: 'Löwenstein' },
  { id: 'lumis', name: 'Lumis 150', brand: 'ResMed' },
];

const MASK_TYPES = [
  { id: 'nasal', name: 'Masque nasal', desc: 'Couvre uniquement le nez' },
  { id: 'facial', name: 'Masque facial', desc: 'Couvre nez et bouche' },
  { id: 'narinaire', name: 'Masque narinaire', desc: 'Embouts dans les narines' },
  { id: 'hybride', name: 'Masque hybride', desc: 'Combinaison nasal/narinaire' },
];

export function NewPatient() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    nir: '',
    email: '',
    phone: '',
    birth_date: '',
    address: '',
    prescribing_doctor: '',
    panel_code: 'PANEL_001',
    machine_type: '',
    mask_type: '',
    installation_date: new Date().toISOString().split('T')[0],
  });

  const steps = [
    { number: 1, title: 'Identité', icon: User, desc: 'Informations patient' },
    { number: 2, title: 'Médical', icon: FileText, desc: 'Ordonnance & médecin' },
    { number: 3, title: 'Matériel', icon: Package, desc: 'Machine & masque' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, ordonnance_file: e.target.files[0] });
    }
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.nir || 
          !formData.email || !formData.phone || !formData.birth_date) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return false;
      }
      // Validation NIR (15 chiffres)
      if (!/^\d{15}$/.test(formData.nir)) {
        toast.error('Le NIR doit contenir 15 chiffres');
        return false;
      }
      // Validation email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('Email invalide');
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.prescribing_doctor || !formData.panel_code) {
        toast.error('Veuillez renseigner le médecin prescripteur et le panel code');
        return false;
      }
      if (!formData.ordonnance_file) {
        toast.error('Veuillez télécharger l\'ordonnance (obligatoire pour la CPAM)');
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.machine_type || !formData.mask_type || !formData.installation_date) {
        toast.error('Veuillez sélectionner la machine, le masque et la date d\'installation');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    try {
      setLoading(true);
      const supabase = createClient();

      // 1. Upload de l'ordonnance vers Supabase Storage
      let ordonnanceUrl = '';
      if (formData.ordonnance_file) {
        const fileName = `${Date.now()}_${formData.ordonnance_file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(fileName, formData.ordonnance_file);

        if (uploadError) {
          console.error('[NewPatient] Upload error:', uploadError);
          toast.error('Erreur lors du téléchargement de l\'ordonnance');
          setLoading(false);
          return;
        }

        // Générer l'URL signée
        const { data: urlData } = await supabase.storage
          .from('prescriptions')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 an

        ordonnanceUrl = urlData?.signedUrl || '';
      }

      // 2. Créer le patient dans la base
      const newPatientId = crypto.randomUUID();
      
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: newPatientId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          nir: formData.nir,
          email: formData.email,
          phone: formData.phone,
          birth_date: formData.birth_date,
          address: formData.address,
          prescribing_doctor: formData.prescribing_doctor,
          panel_code: formData.panel_code,
          created_at: new Date().toISOString(),
        });

      if (patientError) {
        console.error('[NewPatient] Patient creation error:', patientError);
        toast.error('Erreur lors de la création du patient');
        setLoading(false);
        return;
      }

      // 3. Créer l'équipement
      const { error: equipmentError } = await supabase
        .from('equipment')
        .insert({
          patient_id: newPatientId,
          equipment_name: MACHINE_TYPES.find(m => m.id === formData.machine_type)?.name || formData.machine_type,
          equipment_type: 'machine',
          installation_date: formData.installation_date,
          next_renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

      const { error: maskError } = await supabase
        .from('equipment')
        .insert({
          patient_id: newPatientId,
          equipment_name: MASK_TYPES.find(m => m.id === formData.mask_type)?.name || formData.mask_type,
          equipment_type: 'mask',
          installation_date: formData.installation_date,
          next_renewal_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 mois
        });

      if (equipmentError || maskError) {
        console.warn('[NewPatient] Equipment creation warning:', equipmentError || maskError);
      }

      // 4. Créer un document pour l'ordonnance
      if (ordonnanceUrl) {
        await supabase
          .from('patient_documents')
          .insert({
            patient_id: newPatientId,
            document_type: 'ordonnance',
            document_name: formData.ordonnance_file?.name || 'Ordonnance initiale',
            file_url: ordonnanceUrl,
            uploaded_at: new Date().toISOString(),
          });
      }

      // 5. TODO: Envoyer un email d'invitation au patient
      // En production, cela se ferait via un endpoint backend
      console.log('[NewPatient] Email invitation should be sent to:', formData.email);

      toast.success('Patient créé avec succès !', {
        description: `${formData.first_name} ${formData.last_name} a été ajouté au système.`,
        duration: 5000,
      });

      // Rediriger vers le détail du patient
      setTimeout(() => {
        navigate(`/pro/patients/${newPatientId}`);
      }, 1500);

    } catch (error: any) {
      console.error('[NewPatient] Error:', error);
      toast.error('Erreur lors de la création du patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F0EB]">
      {/* Header */}
      <header className="bg-white border-b border-[#D9D5CC]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-[#1A1A1A] mb-2">Admission d'un nouveau patient</h1>
              <p className="text-sm text-[#5C5C5C]">
                Formulaire en {steps.length} étapes • Étape {currentStep}/{steps.length}
              </p>
            </div>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
            >
              Annuler
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="bg-white rounded-2xl p-8 border border-[#D9D5CC] mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all ${
                      isCompleted 
                        ? 'bg-[#18753C] text-white' 
                        : isActive
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F0EB] text-[#5C5C5C]'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-8 h-8" />
                      ) : (
                        <Icon className="w-8 h-8" />
                      )}
                    </div>
                    <h3 className={`text-sm mb-1 ${
                      isActive ? 'text-[#007AFF]' : 'text-[#5C5C5C]'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#5C5C5C]">{step.desc}</p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 w-full mx-4 transition-all ${
                      isCompleted ? 'bg-[#18753C]' : 'bg-[#D9D5CC]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl p-8 border border-[#D9D5CC]"
          >
            {/* ÉTAPE 1 - IDENTITÉ */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-[#1A1A1A] mb-2">Informations personnelles</h2>
                  <p className="text-sm text-[#5C5C5C]">
                    Renseignez les informations d'identité du patient
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Jean"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Dupont"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Numéro de Sécurité Sociale (NIR) <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.nir}
                      onChange={(e) => setFormData({ ...formData, nir: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                      placeholder="123456789012345"
                      maxLength={15}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] font-mono"
                      required
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">15 chiffres</p>
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date de naissance <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jean.dupont@email.fr"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Téléphone <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    Adresse complète
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Rue de la Santé, 75014 Paris"
                    rows={3}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 2 - MÉDICAL */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-[#1A1A1A] mb-2">Informations médicales</h2>
                  <p className="text-sm text-[#5C5C5C]">
                    Médecin prescripteur et ordonnance obligatoire
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-1">
                        Document obligatoire CPAM
                      </h3>
                      <p className="text-xs text-blue-700">
                        L'ordonnance médicale est requise pour la prise en charge par la Sécurité Sociale.
                        Elle sera stockée de manière sécurisée et accessible uniquement aux personnes autorisées.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        Médecin prescripteur <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={formData.prescribing_doctor}
                      onChange={(e) => setFormData({ ...formData, prescribing_doctor: e.target.value })}
                      placeholder="Dr. Sophie Martin"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#5C5C5C] mb-2">
                      Panel Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.panel_code}
                      onChange={(e) => setFormData({ ...formData, panel_code: e.target.value })}
                      placeholder="PANEL_001"
                      className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      required
                    />
                    <p className="text-xs text-[#5C5C5C] mt-1">
                      Code de segmentation pour ce médecin
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Ordonnance médicale <span className="text-red-500">*</span>
                    </div>
                  </label>
                  
                  <div className="border-2 border-dashed border-[#D9D5CC] rounded-2xl p-8 text-center hover:border-[#007AFF] transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="ordonnance-upload"
                    />
                    <label htmlFor="ordonnance-upload" className="cursor-pointer">
                      {formData.ordonnance_file ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-green-100 rounded-xl">
                            <Check className="w-8 h-8 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-[#1A1A1A] font-semibold">
                              {formData.ordonnance_file.name}
                            </p>
                            <p className="text-xs text-[#5C5C5C] mt-1">
                              {(formData.ordonnance_file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Changer de fichier
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-[#007AFF]/10 rounded-xl">
                            <Upload className="w-8 h-8 text-[#007AFF]" />
                          </div>
                          <div>
                            <p className="text-sm text-[#1A1A1A] font-semibold mb-1">
                              Cliquez pour télécharger l'ordonnance
                            </p>
                            <p className="text-xs text-[#5C5C5C]">
                              PDF, JPG ou PNG • Max 10 MB
                            </p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 - MATÉRIEL */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl text-[#1A1A1A] mb-2">Équipement médical</h2>
                  <p className="text-sm text-[#5C5C5C]">
                    Sélectionnez la machine PPC et le type de masque
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-3">
                    Machine PPC <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {MACHINE_TYPES.map((machine) => (
                      <div
                        key={machine.id}
                        onClick={() => setFormData({ ...formData, machine_type: machine.id })}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.machine_type === machine.id
                            ? 'border-[#007AFF] bg-[#007AFF]/5'
                            : 'border-[#D9D5CC] hover:border-[#007AFF]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-[#1A1A1A]">
                            {machine.name}
                          </h3>
                          {formData.machine_type === machine.id && (
                            <div className="w-6 h-6 bg-[#007AFF] rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {machine.brand}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-3">
                    Type de masque <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {MASK_TYPES.map((mask) => (
                      <div
                        key={mask.id}
                        onClick={() => setFormData({ ...formData, mask_type: mask.id })}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          formData.mask_type === mask.id
                            ? 'border-[#007AFF] bg-[#007AFF]/5'
                            : 'border-[#D9D5CC] hover:border-[#007AFF]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-[#1A1A1A]">
                            {mask.name}
                          </h3>
                          {formData.mask_type === mask.id && (
                            <div className="w-6 h-6 bg-[#007AFF] rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-[#5C5C5C]">{mask.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#5C5C5C] mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date d'installation prévue <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D9D5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                    required
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-green-900 mb-1">
                        Prêt pour l'admission
                      </h3>
                      <p className="text-xs text-green-700">
                        En validant, vous allez créer le dossier patient, enregistrer l'ordonnance 
                        et affecter l'équipement. Un email d'invitation sera automatiquement envoyé à{' '}
                        <span className="font-semibold">{formData.email || 'l\'adresse renseignée'}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-8 border-t border-[#D9D5CC] mt-8">
              {currentStep > 1 ? (
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  className="bg-[#007AFF] hover:bg-[#0051D5] gap-2 ml-auto"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#18753C] hover:bg-[#18753C] gap-2 ml-auto"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Créer le patient
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
