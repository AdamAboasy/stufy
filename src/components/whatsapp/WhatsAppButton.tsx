import React from 'react';

interface WhatsAppButtonProps {
  isArabic?: boolean;
  variant?: 'prominent' | 'floating' | 'banner' | 'pill';
  customClass?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  isArabic = true,
  variant = 'prominent',
  customClass = ''
}) => {
  const phoneNumber = '201010014590';
  const prefilledText = isArabic
    ? 'مرحباً، أود الاستفسار والحصول على كود تفعيل لتطبيق مخطط الدراسة الذكي (Smart Study Planner)'
    : 'Hello, I would like to get an activation code for Smart Study Planner';

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(prefilledText)}`;

  // SVG WhatsApp Icon (Official Vector)
  const WhatsAppIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.336 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );

  if (variant === 'pill') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white bg-brand-whatsapp hover:bg-brand-whatsapp-hover transition-all duration-300 shadow-glow-whatsapp active:scale-95 ${customClass}`}
      >
        <WhatsAppIcon className="w-5 h-5" />
        <span>{isArabic ? 'معندكش كود؟ تواصل معانا على واتساب' : "Don't have an activation code? Contact us on WhatsApp"}</span>
      </a>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border border-brand-whatsapp/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow-whatsapp ${customClass}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-whatsapp flex items-center justify-center text-white shadow-md shrink-0 animate-pulse">
            <WhatsAppIcon className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">
              {isArabic ? 'معندكش كود تفعيل؟' : "Don't have an activation code?"}
            </h4>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              {isArabic 
                ? 'فريق الدعم متاح 24/7 عبر واتساب لتسليمك كود التفعيل فوراً وتفعيل باقتك'
                : 'Our support team is online 24/7 on WhatsApp to issue your activation code instantly.'}
            </p>
          </div>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-brand-whatsapp hover:bg-brand-whatsapp-hover transition-all duration-200 shadow-md active:scale-95 shrink-0"
        >
          <WhatsAppIcon className="w-5 h-5" />
          <span>{isArabic ? 'تواصل معانا على واتساب' : 'Contact on WhatsApp'}</span>
        </a>
      </div>
    );
  }

  // Default: Prominent Button with high visibility
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto px-6 py-4 rounded-xl font-bold text-base text-white bg-brand-whatsapp hover:bg-brand-whatsapp-hover transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-glow-whatsapp active:scale-[0.98] overflow-hidden ${customClass}`}
    >
      {/* Background highlight shine */}
      <span className="absolute top-0 right-0 -mt-1 -mr-1 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
      
      {/* WhatsApp Official Icon */}
      <span className="p-1.5 rounded-lg bg-black/15 group-hover:scale-110 transition-transform duration-300">
        <WhatsAppIcon className="w-6 h-6 text-white" />
      </span>

      <span className="tracking-tight text-center">
        {isArabic ? 'معندكش كود؟ تواصل معانا على واتساب' : "Don't have an activation code? Contact us on WhatsApp"}
      </span>

      <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-black/20 text-emerald-100">
        01010014590
      </span>
    </a>
  );
};
