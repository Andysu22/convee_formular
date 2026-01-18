import { useState, useEffect, useRef } from 'react';
import { client } from './lib/directus'; // PFAD KORRIGIERT
import { readItem, updateItem } from '@directus/sdk';

// --- UI COMPONENTS ---

const OptionCard = ({ icon, title, subtitle, selected, onClick, special }) => (
  <div 
    onClick={onClick}
    className={`
      group cursor-pointer rounded-2xl p-5 transition-all duration-300 flex items-center gap-4 relative select-none
      border shadow-sm
      ${selected 
        ? 'bg-blue-600 border-blue-600 shadow-blue-200 shadow-lg transform scale-[1.01]' 
        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:bg-slate-50/50'
      }
    `}
  >
    <div className={`
      w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors
      ${selected 
        ? 'bg-white/20 text-white' 
        : (special ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-500')
      }
    `}>
      <i className={`ph ${icon}`}></i>
    </div>
    
    <div className="flex-grow">
      <div className={`font-semibold text-[15px] transition-colors ${selected ? 'text-white' : 'text-slate-800'}`}>
        {title}
      </div>
      {subtitle && (
        <div className={`text-xs mt-0.5 font-medium transition-colors ${selected ? 'text-blue-100' : 'text-slate-400'}`}>
          {subtitle}
        </div>
      )}
    </div>

    {selected && (
      <div className="text-white animate-in absolute top-5 right-5">
        <i className="ph-bold ph-check-circle text-xl"></i>
      </div>
    )}
  </div>
);

const StepHeader = ({ current, total }) => (
  <div className="bg-white/95 backdrop-blur-md px-8 pt-8 pb-6 sticky top-0 z-20 border-b border-slate-50">
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm font-bold text-slate-900 tracking-tight bg-slate-100 px-3 py-1 rounded-full">
        Anfrage
      </span>
      <span className="text-xs font-semibold text-slate-400">
        Schritt {current} / {total}
      </span>
    </div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div 
        className="bg-blue-600 h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
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
  
  const scrollRef = useRef(null); // Referenz zum Scrollen

  const [formData, setFormData] = useState({
    einkommen: '',
    finanzierung: '',
    schufa: '',
    grund: ''
  });

  const COLLECTION = 'kunden'; // NAME KORRIGIERT

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
        setErrorMessage("Der Link ist ungültig.");
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
        setErrorMessage("Zugriff verweigert oder ID falsch.");
        setAppState('error');
      }
    };

    checkUuid();
  }, []);

  // Funktion zum Scrollen nach oben bei Step-Wechsel
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

  const handleSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (step < 4) {
      setTimeout(() => setStep(s => s + 1), 250);
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
      alert("Fehler beim Senden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SCREENS ---

  if (appState === 'loading') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="loader rounded-full border-4 h-10 w-10 border-slate-200"></div>
      </div>
    );
  }

  if (['error', 'already_submitted', 'success'].includes(appState)) {
    const config = {
      error: { icon: "ph-warning-circle", title: "Ups!", text: errorMessage, color: "text-red-500 bg-red-50" },
      already_submitted: { icon: "ph-check-circle", title: "Erledigt", text: "Wir haben Ihre Daten bereits erhalten.", color: "text-blue-600 bg-blue-50" },
      success: { icon: "ph-paper-plane-tilt", title: "Gesendet!", text: "Vielen Dank für Ihre Anfrage.", color: "text-green-600 bg-green-50" }
    }[appState];

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 animate-in bg-slate-50">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl max-w-sm w-full text-center border border-slate-100">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl ${config.color}`}>
            <i className={`ph-fill ${config.icon}`}></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{config.title}</h2>
          <p className="text-slate-500 font-medium">{config.text}</p>
        </div>
      </div>
    );
  }

  // --- ACTIVE FORM ---

  return (
    <div className="flex items-center justify-center h-screen w-full p-0 sm:p-4 bg-slate-50 overflow-hidden">
      
      {/* HAUPT CONTAINER */}
      <div className="
        w-full max-w-[460px] 
        bg-white 
        sm:rounded-[2rem] 
        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] 
        border-none sm:border sm:border-white
        flex flex-col 
        h-full sm:h-auto sm:min-h-[650px] sm:max-h-[85vh]
        animate-in
        relative
      ">
        
        <StepHeader current={step} total={4} />

        {/* SCROLL BEREICH */}
        <div ref={scrollRef} className="flex-grow px-8 py-4 overflow-y-auto no-scrollbar scroll-smooth">
          
          {step === 1 && (
            <div className="animate-in space-y-6 pb-4">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Einkommen</h1>
                <p className="text-slate-500 mt-2 font-medium">Wie hoch ist das monatliche Haushaltsnettoeinkommen?</p>
              </div>
              <div className="flex flex-col gap-3">
                {['Unter 2.500 €', '2.500 € – 4.000 €', '4.000 € – 6.000 €', 'Über 6.000 €'].map((opt, i) => (
                  <OptionCard 
                    key={i} title={opt} 
                    icon={['trend-down', 'coins', 'chart-bar', 'crown'][i]} 
                    selected={formData.einkommen === opt} 
                    onClick={() => handleSelect('einkommen', opt)} 
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in space-y-6 pb-4">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Finanzierung</h1>
                <p className="text-slate-500 mt-2 font-medium">Liegt bereits eine Bestätigung oder ein Nachweis vor?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard title="Ja, liegt vor" subtitle="Beschleunigt den Prozess" icon="check-circle" special={true}
                  selected={formData.finanzierung === 'Ja, liegt vor'} onClick={() => handleSelect('finanzierung', 'Ja, liegt vor')} />
                <OptionCard title="Im Gespräch" icon="chats-circle" 
                  selected={formData.finanzierung === 'Im Gespräch'} onClick={() => handleSelect('finanzierung', 'Im Gespräch')} />
                <OptionCard title="Noch nicht" icon="hourglass" 
                  selected={formData.finanzierung === 'Noch nicht'} onClick={() => handleSelect('finanzierung', 'Noch nicht')} />
                <OptionCard title="Eigenkapital / Bar" icon="briefcase" 
                  selected={formData.finanzierung === 'Barzahler'} onClick={() => handleSelect('finanzierung', 'Barzahler')} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in space-y-6 pb-4">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Bonität</h1>
                <p className="text-slate-500 mt-2 font-medium">Gibt es aktuelle Negativeinträge in der Schufa?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard title="Nein, alles sauber" subtitle="Keine Einträge" icon="thumbs-up"
                  selected={formData.schufa === 'Sauber'} onClick={() => handleSelect('schufa', 'Sauber')} />
                <OptionCard title="Ja, Einträge vorhanden" icon="warning-circle"
                  selected={formData.schufa === 'Einträge'} onClick={() => handleSelect('schufa', 'Einträge')} />
                <OptionCard title="Unbekannt" icon="question"
                  selected={formData.schufa === 'Unbekannt'} onClick={() => handleSelect('schufa', 'Unbekannt')} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in space-y-6 pb-4">
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Persönliches</h1>
                <p className="text-slate-500 mt-2 font-medium">Erzählen Sie uns kurz, wer einziehen möchte.</p>
              </div>
              
              <div className={`
                bg-slate-50 rounded-2xl p-5 transition-all duration-300 border
                ${formData.grund.length > 0 ? 'border-blue-500 bg-blue-50/10' : 'border-transparent hover:bg-slate-100'}
              `}>
                <textarea 
                  className="w-full h-36 outline-none text-slate-900 resize-none bg-transparent text-base leading-relaxed placeholder:text-slate-400"
                  placeholder="Guten Tag, wir sind..."
                  value={formData.grund}
                  onChange={(e) => setFormData(prev => ({ ...prev, grund: e.target.value }))}
                  autoFocus
                ></textarea>
              </div>
              <div className="text-right text-xs font-bold text-slate-400">
                {formData.grund.length} Zeichen
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-8 pb-8 pt-4 flex items-center justify-between mt-auto bg-white/80 backdrop-blur-sm z-20">
          
          {/* Back Button */}
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)} 
              className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            >
              <i className="ph-bold ph-arrow-left text-xl"></i>
            </button>
          ) : <div className="w-12"></div>}
          
          {/* Submit Button */}
          {step === 4 && (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || formData.grund.length < 5}
              className={`
                px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg
                ${isSubmitting || formData.grund.length < 5
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-300/50 hover:shadow-blue-400/60 hover:-translate-y-0.5'
                }
              `}
            >
              {isSubmitting ? 'Sende...' : 'Absenden'} 
              {!isSubmitting && <i className="ph-bold ph-paper-plane-right text-lg"></i>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;