import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Facebook, X, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Store className="h-8 w-8 text-primary-400" />
              <span className="text-xl font-bold">MaSociété.info</span>
            </div>
            <p className="text-gray-300 mb-4">
              La première marketplace de Madagascar connectant acheteurs et vendeurs locaux.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <X className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
            <ul className="space-y-2">
              <li><Link to="/categories" className="text-gray-300 hover:text-white transition-colors">Catégories</Link></li>
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/help" className="text-gray-300 hover:text-white transition-colors">Aide</Link></li>
              <li><Link to="/seller/register" className="text-gray-300 hover:text-white transition-colors">Devenir vendeur</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link to="/terms" className="text-gray-300 hover:text-white transition-colors">Conditions d'utilisation</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">contact@masociete.info</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">+261 20 XX XX XX</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">Antananarivo, Madagascar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400">
            © 2025 MaSociété.info. Tous droits réservés.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
            <span className="text-gray-400">Paiements acceptés:</span>
            <div className="flex items-center space-x-3">
              {/* MVola Logo */}
              <div className="bg-white rounded-lg p-2 w-16 h-10 flex items-center justify-center">
                <img 
                  src="/src/assets/mvola.png" 
                  alt="MVola" 
                  className="w-12 h-6 object-contain"
                />
              </div>
              
              {/* Orange Money Logo */}
              <div className="bg-white rounded-lg p-2 w-16 h-10 flex items-center justify-center">
                <img 
                  src="/src/assets/orange_money.jpeg" 
                  alt="Orange Money" 
                  className="w-12 h-6 object-contain"
                />
              </div>
              
              {/* Airtel Money Logo */}
              <div className="bg-white rounded-lg p-2 w-16 h-10 flex items-center justify-center">
                <img 
                  src="/src/assets/airtel_money.png" 
                  alt="Airtel Money" 
                  className="w-12 h-6 object-contain"
                />
              </div>
              
              {/* Visa/Mastercard Logo */}
              <div className="bg-white rounded-lg p-2 w-16 h-10 flex items-center justify-center">
                <img 
                  src="/src/assets/visa_mastercard.png" 
                  alt="Visa/Mastercard" 
                  className="w-12 h-6 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;