import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BLUE = '#3b82f6';
const VIOLET = '#8b5cf6';

// ============================================
// DONNEES MOCK
// ============================================

const PROBLEM_TREE = [
  {
    id: '1',
    question: 'Quel est votre probleme ?',
    options: [
      { label: 'Mon masque est inconfortable', nextId: '1a' },
      { label: 'J ai des fuites', nextId: '1b' },
      { label: 'Ma machine fait du bruit', nextId: '1c' },
      { label: 'Je n arrive pas a dormir', nextId: '1d' },
      { label: 'Autre probleme', nextId: '1e' },
    ],
  },
  {
    id: '1a',
    question: 'Ou ressentez-vous l inconfort ?',
    options: [
      { label: 'Arrete du nez', nextId: 'result_adjust' },
      { label: 'Sangles trop serrees', nextId: 'result_loosen' },
      { label: 'Irritation de la peau', nextId: 'result_skin' },
      { label: 'Bouche seche', nextId: 'result_humidifier' },
    ],
  },
  {
    id: '1b',
    question: 'Quand surviennent les fuites ?',
    options: [
      { label: 'Des le debut de la nuit', nextId: 'result_fit' },
      { label: 'En milieu de nuit', nextId: 'result_movement' },
      { label: 'Autour de la bouche', nextId: 'result_chinstrap' },
    ],
  },
];

const PROBLEM_RESULTS: Record<string, { title: string; advice: string; action: string }> = {
  result_adjust: {
    title: 'Ajustement du masque',
    advice: 'Essayez de repositionner le masque sur l arrete de votre nez. Le coussin doit reposer legerement sans appuyer.',
    action: 'Voir la video tutoriel',
  },
  result_loosen: {
    title: 'Tension des sangles',
    advice: 'Desserrez legerement les sangles. Elles doivent etre fermes mais pas serrees. Passez un doigt entre la sangle et votre peau.',
    action: 'Contacter mon prestataire',
  },
  result_skin: {
    title: 'Irritation cutanee',
    advice: 'Nettoyez votre masque quotidiennement. Utilisez une creme barriere avant de porter le masque. Si l irritation persiste, contactez votre prestataire.',
    action: 'Commander un masque different',
  },
  result_humidifier: {
    title: 'Bouche seche',
    advice: 'Augmentez le niveau d humidification de votre appareil. Verifiez que le reservoir d eau est bien rempli.',
    action: 'Voir les reglages',
  },
  result_fit: {
    title: 'Mauvais ajustement',
    advice: 'Refaites l ajustement de votre masque en position allongee. Assurez-vous que le masque est bien centre.',
    action: 'Voir la video d ajustement',
  },
  result_movement: {
    title: 'Fuites liees aux mouvements',
    advice: 'Essayez de dormir sur le dos. Verifiez que le tuyau a suffisamment de jeu pour vos mouvements.',
    action: 'Conseils de positionnement',
  },
  result_chinstrap: {
    title: 'Fuites buccales',
    advice: 'Une mentonniere peut vous aider. Vous pouvez aussi envisager un masque facial complet.',
    action: 'Commander une mentonniere',
  },
};

const TUTORIALS = [
  { id: '1', title: 'Mettre son masque correctement', duration: '3 min', icon: 'videocam-outline' as const },
  { id: '2', title: 'Nettoyer son equipement', duration: '2 min', icon: 'videocam-outline' as const },
  { id: '3', title: 'Regler l humidificateur', duration: '4 min', icon: 'videocam-outline' as const },
  { id: '4', title: 'Comprendre ses donnees', duration: '5 min', icon: 'videocam-outline' as const },
  { id: '5', title: 'Gerer les fuites', duration: '3 min', icon: 'videocam-outline' as const },
];

const FAQ_ITEMS = [
  { id: '1', question: 'Combien d heures dois-je porter mon masque ?', answer: 'L objectif est de porter le masque au moins 4 heures par nuit, 70% des nuits. Plus vous le portez, meilleur sera le traitement.' },
  { id: '2', question: 'Est-ce normal d avoir des marques sur le visage ?', answer: 'De legeres marques sont normales au debut. Si elles persistent ou sont douloureuses, ajustez les sangles ou contactez votre prestataire.' },
  { id: '3', question: 'Comment nettoyer mon masque ?', answer: 'Nettoyez le coussin et le harnais quotidiennement avec de l eau tiede et un savon doux. Rincez bien et laissez secher a l air libre.' },
  { id: '4', question: 'Que faire si ma machine affiche une erreur ?', answer: 'Eteignez et rallumez la machine. Si l erreur persiste, notez le code d erreur et contactez votre prestataire.' },
  { id: '5', question: 'Quand faut-il changer le filtre ?', answer: 'Le filtre doit etre change tous les 1 a 3 mois selon le modele. Verifiez la notice de votre appareil.' },
];

const CHATBOT_MESSAGES = [
  { id: '1', role: 'bot', text: 'Bonjour ! Je suis l assistant MedConnect. Comment puis-je vous aider ?' },
];

// ============================================
// ECRAN AIDE
// ============================================

export default function AidePage() {
  const [activeSection, setActiveSection] = useState<'problem' | 'tutorials' | 'faq' | 'chat' | 'chatbot' | null>(null);
  const [problemStep, setProblemStep] = useState(0);
  const [problemPath, setProblemPath] = useState<string[]>(['1']);
  const [problemResult, setProblemResult] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState(CHATBOT_MESSAGES);

  function handleProblemOption(nextId: string) {
    if (nextId.startsWith('result_')) {
      setProblemResult(nextId);
    } else {
      setProblemPath([...problemPath, nextId]);
      setProblemStep(problemStep + 1);
    }
  }

  function resetProblem() {
    setProblemStep(0);
    setProblemPath(['1']);
    setProblemResult(null);
  }

  function handleSendChat() {
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    // Simulate bot response
    setTimeout(() => {
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'Merci pour votre message. Je suis un assistant IA et je vais vous aider. Pouvez-vous me donner plus de details sur votre situation ?',
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 1000);
  }

  const currentProblem = PROBLEM_TREE.find((p) => p.id === problemPath[problemPath.length - 1]);
  const result = problemResult ? PROBLEM_RESULTS[problemResult] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Aide</Text>
          <Text style={styles.subtitle}>Comment pouvons-nous vous aider ?</Text>
        </View>

        {/* Bouton principal : J'ai un probleme */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => {
            setActiveSection(activeSection === 'problem' ? null : 'problem');
            resetProblem();
          }}
        >
          <View style={styles.mainButtonIcon}>
            <Ionicons name="help-buoy-outline" size={24} color="#ffffff" />
          </View>
          <View style={styles.mainButtonContent}>
            <Text style={styles.mainButtonTitle}>J'ai un probleme</Text>
            <Text style={styles.mainButtonDesc}>Diagnostic guide en quelques etapes</Text>
          </View>
          <Ionicons
            name={activeSection === 'problem' ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {/* Arbre de decision */}
        {activeSection === 'problem' && (
          <View style={styles.expandedSection}>
            {!problemResult && currentProblem && (
              <>
                <Text style={styles.problemQuestion}>{currentProblem.question}</Text>
                {currentProblem.options.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.problemOption}
                    onPress={() => handleProblemOption(opt.nextId)}
                  >
                    <Text style={styles.problemOptionText}>{opt.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
                {problemStep > 0 && (
                  <TouchableOpacity style={styles.backButton} onPress={resetProblem}>
                    <Ionicons name="arrow-back" size={16} color={BLUE} />
                    <Text style={styles.backButtonText}>Recommencer</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {result && (
              <View style={styles.resultCard}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#22c55e" />
                <Text style={styles.resultTitle}>{result.title}</Text>
                <Text style={styles.resultAdvice}>{result.advice}</Text>
                <TouchableOpacity style={styles.resultActionButton}>
                  <Text style={styles.resultActionText}>{result.action}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={resetProblem}>
                  <Text style={styles.backButtonText}>Nouveau diagnostic</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tutoriels video */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setActiveSection(activeSection === 'tutorials' ? null : 'tutorials')}
        >
          <View style={[styles.sectionButtonIcon, { backgroundColor: '#f0f9ff' }]}>
            <Ionicons name="play-circle-outline" size={24} color={BLUE} />
          </View>
          <View style={styles.sectionButtonContent}>
            <Text style={styles.sectionButtonTitle}>Tutoriels video</Text>
            <Text style={styles.sectionButtonDesc}>{TUTORIALS.length} videos disponibles</Text>
          </View>
          <Ionicons
            name={activeSection === 'tutorials' ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {activeSection === 'tutorials' && (
          <View style={styles.expandedSection}>
            {TUTORIALS.map((tuto) => (
              <TouchableOpacity key={tuto.id} style={styles.tutorialItem}>
                <View style={styles.tutorialThumbnail}>
                  <Ionicons name={tuto.icon} size={24} color={BLUE} />
                </View>
                <View style={styles.tutorialInfo}>
                  <Text style={styles.tutorialTitle}>{tuto.title}</Text>
                  <Text style={styles.tutorialDuration}>{tuto.duration}</Text>
                </View>
                <Ionicons name="play-outline" size={20} color={BLUE} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* FAQ */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setActiveSection(activeSection === 'faq' ? null : 'faq')}
        >
          <View style={[styles.sectionButtonIcon, { backgroundColor: '#f5f3ff' }]}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color={VIOLET} />
          </View>
          <View style={styles.sectionButtonContent}>
            <Text style={styles.sectionButtonTitle}>Questions frequentes</Text>
            <Text style={styles.sectionButtonDesc}>{FAQ_ITEMS.length} questions</Text>
          </View>
          <Ionicons
            name={activeSection === 'faq' ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {activeSection === 'faq' && (
          <View style={styles.expandedSection}>
            {FAQ_ITEMS.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={styles.faqItem}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#94a3b8"
                  />
                </View>
                {expandedFaq === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contact prestataire */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setActiveSection(activeSection === 'chat' ? null : 'chat')}
        >
          <View style={[styles.sectionButtonIcon, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="people-outline" size={24} color="#22c55e" />
          </View>
          <View style={styles.sectionButtonContent}>
            <Text style={styles.sectionButtonTitle}>Contacter mon prestataire</Text>
            <Text style={styles.sectionButtonDesc}>Messagerie directe</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {activeSection === 'chat' && (
          <View style={styles.expandedSection}>
            <View style={styles.contactCard}>
              <View style={styles.contactAvatar}>
                <Ionicons name="business-outline" size={24} color={BLUE} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>Oxynov Sant&eacute;</Text>
                <Text style={styles.contactStatus}>En ligne</Text>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="call-outline" size={18} color={BLUE} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactButton}>
                <Ionicons name="mail-outline" size={18} color={BLUE} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Chatbot IA */}
        <TouchableOpacity
          style={styles.sectionButton}
          onPress={() => setActiveSection(activeSection === 'chatbot' ? null : 'chatbot')}
        >
          <View style={[styles.sectionButtonIcon, { backgroundColor: '#faf5ff' }]}>
            <Ionicons name="sparkles-outline" size={24} color={VIOLET} />
          </View>
          <View style={styles.sectionButtonContent}>
            <Text style={styles.sectionButtonTitle}>Assistant IA</Text>
            <Text style={styles.sectionButtonDesc}>Posez vos questions 24h/24</Text>
          </View>
          <Ionicons
            name={activeSection === 'chatbot' ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>

        {activeSection === 'chatbot' && (
          <View style={styles.chatSection}>
            <View style={styles.chatMessages}>
              {chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot,
                  ]}
                >
                  {msg.role === 'bot' && (
                    <Ionicons name="sparkles" size={14} color={VIOLET} style={{ marginBottom: 4 }} />
                  )}
                  <Text
                    style={[
                      styles.chatBubbleText,
                      msg.role === 'user' && styles.chatBubbleTextUser,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Posez votre question..."
                placeholderTextColor="#94a3b8"
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.chatSendButton, !chatInput.trim() && { opacity: 0.4 }]}
                onPress={handleSendChat}
                disabled={!chatInput.trim()}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 4,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
    borderWidth: 1.5,
    borderColor: BLUE + '20',
  },
  mainButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonContent: {
    flex: 1,
  },
  mainButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  mainButtonDesc: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 2,
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  sectionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionButtonContent: {
    flex: 1,
  },
  sectionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionButtonDesc: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 2,
  },
  expandedSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Problem tree
  problemQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  problemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  problemOptionText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BLUE,
  },
  resultCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  resultAdvice: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
  },
  resultActionButton: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  resultActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Tutorials
  tutorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tutorialThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  tutorialDuration: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: 2,
  },
  // FAQ
  faqItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 10,
  },
  // Contact
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  contactStatus: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
    marginTop: 2,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chatbot
  chatSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    marginTop: -4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chatMessages: {
    padding: 16,
    gap: 12,
    maxHeight: 300,
  },
  chatBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  chatBubbleBot: {
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  chatBubbleUser: {
    backgroundColor: BLUE,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  chatBubbleText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  chatBubbleTextUser: {
    color: '#ffffff',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    maxHeight: 100,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
