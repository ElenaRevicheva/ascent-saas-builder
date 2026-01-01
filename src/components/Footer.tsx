import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="text-2xl font-bold text-foreground mb-4 block flex items-center gap-2">
              🇪🇸 EspaLuz
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              Empowering families to learn Spanish together with AI-powered tutoring 
              that adapts to every learning style and pace.
            </p>
            <div className="flex space-x-6">
              <a href="https://www.youtube.com/@AIdeazz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-lg">📺</span>
                <span className="font-semibold">YouTube</span>
              </a>
              <a href="https://t.me/EspaLuz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#006ba3] text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <span className="text-lg">✈️</span>
                <span className="font-semibold">Telegram</span>
              </a>
            </div>
          </div>
          
          {/* Product column hidden for MVP */}
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact & Info</h3>
            <div className="space-y-4">
              <p className="text-gray-600 text-sm leading-relaxed">EspaLuz is part of the AIdeazz ecosystem. Find more info and contact options below:</p>
              <div className="space-y-3">
                <a href="https://www.aideazz.xyz" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-lg border border-purple-200/50 hover:border-purple-300 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-sm font-bold">AI</span>
                  </div>
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">AIdeazz Ecosystem</span>
                  <span className="text-purple-400 group-hover:text-purple-600 transition-colors duration-300">→</span>
                </a>
                <a href="https://www.aideazz.xyz/card" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-pink-50 hover:from-orange-100 hover:to-pink-100 rounded-lg border border-orange-200/50 hover:border-orange-300 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-sm">👤</span>
                  </div>
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">Founder: Elena Revicheva (Business Card)</span>
                  <span className="text-orange-400 group-hover:text-orange-600 transition-colors duration-300">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2025 EspaLuz AI Family Tutor. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;