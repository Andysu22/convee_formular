import { useState, useEffect, useRef } from 'react';
import { client } from './lib/directus';
import { readItem, updateItem } from '@directus/sdk';

// ICONS
import { 
  TrendDown, Coins, ChartBar, Crown,          
  CheckCircle, ChatsCircle, Hourglass, Briefcase, 
  ThumbsUp, WarningCircle, Question,          
  ArrowLeft, PaperPlaneRight,                 
  CheckFat, Confetti, CircleNotch, Info 
} from '@phosphor-icons/react';

// --- UI COMPONENTS ---

const OptionCard = ({ IconComponent, title, subtitle, selected, onClick }) => (
  <div 
    onClick={onClick}
    className={`
      group cursor-pointer rounded-2xl p-5 transition-all duration-300 flex items-center gap-5 relative select-none
      border
      ${selected 
        ? 'bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/10 transform scale-[1.02] z-10' 
        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md hover:z-10'
      }
    `}
  >
    {/* Icon Container */}
    <div className={`
      w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-300
      ${selected 
        ? 'bg-white/10 text-white' 
        : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900'
      }
    `}>
      <IconComponent size={24} weight={selected ? "fill" : "regular"} />
    </div>
    
    {/* Text */}
    <div className="flex-grow">
      <div className={`font-semibold text-[15px] transition-colors ${selected ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </div>
      {subtitle && (
        <div className={`text-xs mt-1 font-medium transition-colors ${selected ? 'text-slate-400' : 'text-slate-500'}`}>
          {subtitle}
        </div>
      )}
    </div>

    {/* Checkmark (Dezent) */}
    {selected && (
      <div className="text-white animate-in absolute top-5 right-5 opacity-50">
        <CheckCircle size={18} weight="fill" />
      </div>
    )}
  </div>
);

const StepHeader = ({ current, total }) => (
  <div className="bg-white/80 backdrop-blur-xl px-6 sm:px-10 pt-8 pb-6 sticky top-0 z-20 border-b border-slate-50/50">
    <div className="flex justify-between items-end mb-4">
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Anfrage</span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Schritt {current} <span className="text-slate-300 font-normal">/ {total}</span></h2>
      </div>
    </div>
    {/* Progress Bar */}
    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
      <div 
        className="bg-slate-900 h-full transition-all duration-700 ease-out rounded-full" 
        style={{ width: `${(current/total)*100}%` }}
      ></div>
    </div>
  </div>
);

// --- MAIN APP ---

function App() {
  const [uuid, setUuid] = useState(null);
  const [appState, setAppState] = useState('loading'); 
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const scrollRef = useRef(null);
  const MAX_CHARS = 600; // Maximale Zeichenanzahl

  const [formData, setFormData] = useState({
    einkommen: '',
    finanzierung: '',
    schufa: '',
    grund: ''
  });

  const COLLECTION = 'kunden'; 

  useEffect(() => {
    const checkUuid = async () => {
      const params = new URLSearchParams(window.location.search);
      let foundUuid = params.get('uuid');
      
      if (!foundUuid) {
        const parts = window.location.pathname.split('/').filter(p => p.length > 0);
        if (parts.length > 0 && parts[parts.length - 1].length > 20) {
          foundUuid = parts[parts.length - 1];
        }
      }

      if (!foundUuid) {
        setErrorMessage("Dieser Link ist leider nicht mehr aktuell.");
        setAppState('error');
        return;
      }

      setUuid(foundUuid);

      try {
        const item = await client.request(readItem(COLLECTION, foundUuid, {
          fields: ['id', 'status']
        }));

        if (item.status === 'submitted') {
          setAppState('already_submitted');
        } else {
          setAppState('active');
        }
      } catch (err) {
        console.error(err);
        setErrorMessage("Wir konnten diesen Datensatz leider nicht zuordnen.");
        setAppState('error');
      }
    };

    checkUuid();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

  const handleSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (step < 4) {
      setTimeout(() => setStep(s => s + 1), 300);
    }
  };

  const handleSubmit = async () => {
    if (!uuid) return;
    setIsSubmitting(true);

    try {
      await client.request(updateItem(COLLECTION, uuid, {
        ...formData,
        status: 'submitted'
      }));
      setAppState('success');
    } catch (err) {
      console.error(err);
      setErrorMessage("Verbindung unterbrochen. Bitte versuchen Sie es später erneut.");
      setAppState('error'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SCREENS ---

  if (appState === 'loading') {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center gap-6 bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (['error', 'already_submitted', 'success'].includes(appState)) {
    const config = {
      error: { 
        Icon: Info, 
        title: "Hinweis", 
        text: errorMessage, 
        color: "text-slate-900 bg-slate-100" 
      },
      already_submitted: { 
        Icon: CheckFat, 
        title: "Bereits eingegangen", 
        text: "Wir prüfen Ihre Angaben aktuell – Sie müssen hier nichts weiter tun.", 
        color: "text-slate-900 bg-slate-100" 
      },
      success: { 
        Icon: Confetti, 
        title: "Vielen Dank", 
        text: "Ihre Angaben wurden sicher übermittelt. Sie erhalten in Kürze eine Bestätigung per E-Mail.", 
        color: "text-white bg-slate-900" 
      }
    }[appState];

    const StatusIcon = config.Icon;

    return (
      <div className="h-[100dvh] w-full flex items-center justify-center p-6 animate-in bg-slate-50">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 max-w-sm w-full text-center">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 text-5xl shadow-lg ${config.color}`}>
            <StatusIcon weight="fill" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{config.title}</h2>
          <p className="text-slate-500 font-medium leading-relaxed">{config.text}</p>
        </div>
      </div>
    );
  }

  // --- ACTIVE FORM ---

  const remainingChars = MAX_CHARS - formData.grund.length;

  return (
    <div className="flex items-center justify-center h-[100dvh] w-full bg-slate-100/50 overflow-hidden sm:p-6 md:p-8">
      
      <div className="
        w-full sm:max-w-[480px] 
        bg-white 
        h-full sm:h-auto sm:min-h-[700px] sm:max-h-[90vh]
        flex flex-col 
        animate-in
        relative
        sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-slate-200/60 sm:border sm:border-white
      ">
        
        <StepHeader current={step} total={4} />

        {/* SCROLL AREA */}
        <div ref={scrollRef} className="flex-grow px-6 sm:px-10 py-8 overflow-y-auto no-scrollbar scroll-smooth">
          
          {step === 1 && (
            <div className="animate-in space-y-8 pb-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Einkommen</h1>
                <p className="text-slate-500 font-medium leading-relaxed">Wie hoch ist das monatliche Haushaltsnettoeinkommen?</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { l: 'Unter 2.500 €', i: TrendDown },
                  { l: '2.500 € – 4.000 €', i: Coins },
                  { l: '4.000 € – 6.000 €', i: ChartBar },
                  { l: 'Über 6.000 €', i: Crown }
                ].map((opt, i) => (
                  <OptionCard 
                    key={i} 
                    title={opt.l} 
                    IconComponent={opt.i} 
                    selected={formData.einkommen === opt.l} 
                    onClick={() => handleSelect('einkommen', opt.l)} 
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in space-y-8 pb-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Finanzierung</h1>
                <p className="text-slate-500 font-medium leading-relaxed">Liegt bereits eine Finanzierungsbestätigung vor?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard title="Ja, liegt vor" subtitle="Empfohlen" IconComponent={CheckCircle}
                  selected={formData.finanzierung === 'Ja, liegt vor'} onClick={() => handleSelect('finanzierung', 'Ja, liegt vor')} />
                <OptionCard title="Im Gespräch" IconComponent={ChatsCircle} 
                  selected={formData.finanzierung === 'Im Gespräch'} onClick={() => handleSelect('finanzierung', 'Im Gespräch')} />
                <OptionCard title="Noch nicht" IconComponent={Hourglass} 
                  selected={formData.finanzierung === 'Noch nicht'} onClick={() => handleSelect('finanzierung', 'Noch nicht')} />
                <OptionCard title="Eigenkapital" subtitle="Barzahler" IconComponent={Briefcase} 
                  selected={formData.finanzierung === 'Barzahler'} onClick={() => handleSelect('finanzierung', 'Barzahler')} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in space-y-8 pb-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Bonität</h1>
                <p className="text-slate-500 font-medium leading-relaxed">Gibt es aktuelle Negativeinträge in der Schufa?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard title="Nein, alles sauber" IconComponent={ThumbsUp}
                  selected={formData.schufa === 'Sauber'} onClick={() => handleSelect('schufa', 'Sauber')} />
                <OptionCard title="Ja, Einträge vorhanden" IconComponent={WarningCircle}
                  selected={formData.schufa === 'Einträge'} onClick={() => handleSelect('schufa', 'Einträge')} />
                <OptionCard title="Unbekannt" IconComponent={Question}
                  selected={formData.schufa === 'Unbekannt'} onClick={() => handleSelect('schufa', 'Unbekannt')} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in space-y-8 pb-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Persönliches</h1>
                <p className="text-slate-500 font-medium leading-relaxed">Erzählen Sie uns kurz, wer einziehen möchte.</p>
              </div>
              
              <div className={`
                rounded-2xl p-5 transition-all duration-300 border
                ${formData.grund.length > 0 
                  ? 'border-slate-900 bg-white shadow-lg shadow-slate-900/5' // Aktiv: Feiner 1px Rand, Weiß
                  : 'border-transparent bg-slate-50 hover:bg-slate-100' // Inaktiv: Kein Rand
                }
              `}>
                <textarea 
                  className="w-full h-40 outline-none text-slate-900 resize-none bg-transparent text-lg leading-relaxed placeholder:text-slate-300"
                  placeholder="Guten Tag, wir sind..."
                  value={formData.grund}
                  maxLength={MAX_CHARS}
                  onChange={(e) => setFormData(prev => ({ ...prev, grund: e.target.value }))}
                  autoFocus
                ></textarea>
              </div>
              <div className="flex justify-end">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  remainingChars < 50 
                    ? 'bg-amber-100 text-amber-700' // Warnung bei wenig Platz
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  Noch {remainingChars} Zeichen
                </span>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 sm:px-10 pb-10 sm:pb-10 pt-6 flex items-center justify-between mt-auto bg-white/90 backdrop-blur z-20">
          
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)} 
              className="w-14 h-14 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-100 hover:border-slate-300"
            >
              <ArrowLeft size={22} weight="bold" />
            </button>
          ) : <div className="w-14"></div>}
          
          {step === 4 && (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || formData.grund.length < 5}
              className={`
                px-10 py-4 rounded-full font-bold text-base transition-all duration-300 flex items-center gap-3 shadow-xl 
                ${isSubmitting || formData.grund.length < 5
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-slate-900 text-white shadow-slate-900/30 hover:shadow-2xl hover:-translate-y-1'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <span>Wird gesendet...</span>
                  <CircleNotch size={20} weight="bold" className="animate-spin" />
                </>
              ) : (
                <>
                  <span>Absenden</span>
                  <PaperPlaneRight size={20} weight="fill" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;