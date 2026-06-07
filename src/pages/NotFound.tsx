import { motion } from 'motion/react';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F2F0EB] via-white to-[#F2F0EB] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl"
      >
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-9xl lg:text-[200px] bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] bg-clip-text text-transparent"
          >
            404
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl lg:text-4xl text-[#1A1A1A] mb-4"
        >
          Page introuvable
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-[#5C5C5C] mb-12"
        >
          La page que vous recherchez n'existe pas ou a été déplacée.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[#007AFF] text-[#007AFF] rounded-full hover:bg-[#F2F0EB] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#007AFF] text-white rounded-full hover:bg-[#0051D5] transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            Accueil
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}