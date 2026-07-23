import { Link } from 'react-router-dom'
import { BookOpen, Mail, Github } from 'lucide-react'
import { useCurrency } from '../../context/CurrencyContext'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const { currency, switchCurrency } = useCurrency()

  return (
    <footer className="relative mt-auto border-t border-white/5">
      {/* Gradient top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/images/logo.jpeg"
                alt="SkillWing Logo"
                className="w-8 h-8 rounded-xl object-cover shadow-lg shadow-blue-500/20"
              />
              <span className="text-lg font-bold font-[family-name:var(--font-family-heading)] gradient-text">
                SkillWing
              </span>
            </Link>
            <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
              Learn with purpose, Grow with confidence, Fly with SkillWing
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              <p>Office Address:</p>Anandnagar, Giridih, Jharkhand, Pin-815301
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Browse Courses' },
                { to: '/login', label: 'Sign In' },
                { to: '/register', label: 'Get Started' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Connect
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@skillsphere.dev"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200"
                >
                  <Mail size={14} />
                  skillwingacademy@gmail.com
                </a>
              </li>
              {/* <li>
                <a
                  href="#"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200"
                >
                  <Github size={14} />
                  GitHub
                </a>
              </li> */}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {currentYear} SkillWing. All rights reserved.
          </p>
          {/* <div className="flex items-center gap-4">
            <button
              onClick={() => switchCurrency(currency === 'INR' ? 'USD' : 'INR')}
              className="text-xs text-slate-400 hover:text-white transition-colors border border-white/10 rounded px-2 py-1"
            >
              {currency === 'INR' ? '🇮🇳 INR (₹)' : '🌍 USD ($)'}
            </button>
            <div className="flex items-center gap-1 text-xs text-slate-500 hidden sm:flex">
              <span>Built with</span>
              <span className="text-red-400">♥</span>
              <span>for learners everywhere</span>
            </div>
          </div> */}
        </div>
      </div>
    </footer>
  )
}
