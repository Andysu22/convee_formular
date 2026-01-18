import { useState, useEffect } from 'react';
import { client } from './lib/directus';
import { readItem, updateItem } from '@directus/sdk';

// --- UI COMPONENTS ---

const OptionCard = ({ icon, title, subtitle, selected, onClick, special }) => (
  <div 
    onClick={onClick}
    className={`
      cursor-pointer border rounded-xl p-4 transition-all flex items-center gap-3 relative select-none
      ${selected 
        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 shadow-md' 
        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'
      }
      ${special && !selected ? 'bg-blue-50/30 border-blue-200' : ''}
    `}
  >
    <div className={`
      w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 transition-colors
      ${selected 
        ? 'bg-blue-600 text-white' 
        : (special ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500')
      }
    `}>
      <i className={`ph ${icon}`}></i>
    </div>
    <div className="flex-grow">
      <div className={`font-semibold text-sm md:text-base ${selected ? 'text-blue-900' : 'text-slate-800'}`}>{title}</div>
      {subtitle && <div className={`text-xs mt-0.5 ${special ? 'text-blue-600 font-bold uppercase' : 'text-slate-500'}`}>{subtitle}</div>}
    </div>
    {selected && (
      <div className="text-blue-600 animate-fade-in">
        <i className="ph-fill ph-check-circle text-xl"></i>
      </div>
    )}
  </div>
);

const StepHeader = ({ current, total }) => (
  <div className="bg-white px-6 pt-6 pb-4 sticky top-0 z-10 border-b border-slate-100">
    <div className="flex justify-between items-center mb-3">
      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">Anfrage</span>
      <span className="text-xs font-medium text-slate-400">Schritt {current} von {total}</span>
    </div>
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
      <div 
        className="bg-blue-600 h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
        style={{ width: `${(current/total)*100}%` }}
      ></div>
    </div>
  </div>
);

// --- MAIN LOGIC ---

function App() {
  const [uuid, setUuid] = useState(null);
  const [appState, setAppState] = useState('loading'); // loading, active, already_submitted, success, error
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Formular Daten State
  const [formData, setFormData] = useState({
    einkommen: '',
    finanzierung: '',
    schufa: '',
    grund: ''
  });

  // COLLECTION NAME IN DIRECTUS
  const COLLECTION = 'kunden';

  // 1. Initialisierung: UUID prüfen
  useEffect(() => {
    const checkUuid = async () => {
      const params = new URLSearchParams(window.location.search);
      let foundUuid = params.get('uuid');
      
      // Fallback: UUID aus URL Pfad
      if (!foundUuid) {
        const parts = window.location.pathname.split('/').filter(p => p.length > 0);
        if (parts.length > 0 && parts[parts.length - 1].length > 20) {
          foundUuid = parts[parts.length - 1];
        }
      }

      if (!foundUuid) {
        setErrorMessage("Kein gültiger Identifikations-Link gefunden.");
        setAppState('error');
        return;
      }

      setUuid(foundUuid);

      try {
        // Directus Abfrage: Status prüfen
        const item = await client.request(readItem(COLLECTION, foundUuid, {
          fields: ['id', 'status']
        }));

        if (item.status === 'submitted') {
          setAppState('already_submitted');
        } else {
          setAppState('active');
        }
      } catch (err) {
        console.error("API Error:", err);
        setErrorMessage("Anfrage nicht gefunden oder Zugriff verweigert.");
        setAppState('error');
      }
    };

    checkUuid();
  }, []);

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
      // Update Request an Directus
      await client.request(updateItem(COLLECTION, uuid, {
        einkommen: formData.einkommen,
        finanzierung: formData.finanzierung,
        schufa: formData.schufa,
        grund: formData.grund,
        status: 'submitted' // Wichtig: Status auf 'submitted' setzen
      }));

      setAppState('success');
      
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Es gab ein Problem beim Senden. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERING VIEWS ---

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="loader rounded-full border-4 border-t-4 border-slate-200 h-12 w-12"></div>
        <p className="text-slate-400 font-medium animate-pulse">Lade Daten...</p>
      </div>
    );
  }

  if (appState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            <i className="ph-fill ph-warning-circle"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Fehler</h2>
          <p className="text-slate-500">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (appState === 'already_submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            <i className="ph-fill ph-check-fat"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Bereits empfangen</h2>
          <p className="text-slate-500">
            Wir haben Ihre Angaben zu dieser Anfrage bereits erhalten. Sie müssen das Formular nicht erneut ausfüllen.
          </p>
        </div>
      </div>
    );
  }

  if (appState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center animate-fade-in">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-green-100 shadow-lg">
            <i className="ph-fill ph-confetti"></i>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Vielen Dank!</h2>
          <p className="text-slate-500 mb-6">
            Ihre Daten wurden erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen.
          </p>
        </div>
      </div>
    );
  }

  // --- FORMULAR ---

  return (
    <div className="flex items-center justify-center min-h-screen p-0 sm:p-4 bg-slate-50">
      <div className="bg-white w-full max-w-[500px] sm:rounded-3xl shadow-xl overflow-hidden min-h-screen sm:min-h-[650px] flex flex-col border-slate-200 sm:border relative">
        
        <StepHeader current={step} total={4} />

        <div className="flex-grow px-6 py-4 overflow-y-auto">
          
          {/* STEP 1: Einkommen */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Nettoeinkommen</h1>
                <p className="text-slate-500 mt-1">Monatliches Haushaltsnettoeinkommen aller Personen?</p>
              </div>
              <div className="flex flex-col gap-3">
                {['Unter 2.500 €', '2.500 € – 4.000 €', '4.000 € – 6.000 €', 'Über 6.000 €'].map((opt, i) => (
                  <OptionCard 
                    key={i} 
                    title={opt} 
                    icon={['trend-down', 'coins', 'chart-bar', 'crown'][i]} 
                    selected={formData.einkommen === opt} 
                    onClick={() => handleSelect('einkommen', opt)} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Finanzierung */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Finanzierung</h1>
                <p className="text-slate-500 mt-1">Liegt Ihnen bereits eine Bestätigung oder ein Nachweis vor?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard 
                  title="Ja, liegt bereits vor" 
                  subtitle="Bevorzugte Behandlung" 
                  icon="check-circle" 
                  special={true}
                  selected={formData.finanzierung === 'Ja, liegt vor'}
                  onClick={() => handleSelect('finanzierung', 'Ja, liegt vor')} 
                />
                <OptionCard 
                  title="Im Gespräch mit Bank" 
                  icon="chats-circle" 
                  selected={formData.finanzierung === 'Im Gespräch'}
                  onClick={() => handleSelect('finanzierung', 'Im Gespräch')} 
                />
                <OptionCard 
                  title="Noch nicht gekümmert" 
                  icon="hourglass" 
                  selected={formData.finanzierung === 'Noch nicht'}
                  onClick={() => handleSelect('finanzierung', 'Noch nicht')} 
                />
                <OptionCard 
                  title="Barzahler / Eigenkapital" 
                  icon="briefcase" 
                  selected={formData.finanzierung === 'Barzahler'}
                  onClick={() => handleSelect('finanzierung', 'Barzahler')} 
                />
              </div>
            </div>
          )}

          {/* STEP 3: Schufa */}
          {step === 3 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Bonität / Schufa</h1>
                <p className="text-slate-500 mt-1">Gibt es negative Einträge?</p>
              </div>
              <div className="flex flex-col gap-3">
                <OptionCard 
                  title="Nein, alles sauber" 
                  subtitle="Keine negativen Einträge" 
                  icon="thumbs-up"
                  selected={formData.schufa === 'Sauber'}
                  onClick={() => handleSelect('schufa', 'Sauber')} 
                />
                <OptionCard 
                  title="Ja, Einträge vorhanden" 
                  subtitle="Offene Forderungen etc." 
                  icon="warning-circle"
                  selected={formData.schufa === 'Einträge'}
                  onClick={() => handleSelect('schufa', 'Einträge')} 
                />
                <OptionCard 
                  title="Weiß ich nicht genau" 
                  icon="question"
                  selected={formData.schufa === 'Unbekannt'}
                  onClick={() => handleSelect('schufa', 'Unbekannt')} 
                />
              </div>
            </div>
          )}

          {/* STEP 4: Grund */}
          {step === 4 && (
            <div className="animate-fade-in space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Details & Grund</h1>
                <p className="text-slate-500 mt-1">Erzählen Sie uns kurz von Ihrer Situation.</p>
              </div>
              
              <div className={`
                bg-white border rounded-xl p-4 shadow-sm transition-all
                ${formData.grund.length > 0 ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200 focus-within:border-blue-500'}
              `}>
                <textarea 
                  className="w-full h-40 outline-none text-slate-800 resize-none bg-transparent text-base leading-relaxed placeholder:text-slate-300"
                  placeholder="Beispiel: Wir suchen ab dem 01.08. eine Wohnung..."
                  value={formData.grund}
                  onChange={(e) => setFormData(prev => ({ ...prev, grund: e.target.value }))}
                ></textarea>
              </div>
              
              <div className="flex justify-between mt-2 px-1">
                 <span className={`text-xs font-medium transition-colors ${formData.grund.length >= 10 ? 'text-green-600 flex items-center gap-1' : 'text-slate-300'}`}>
                    {formData.grund.length >= 10 ? <><i className="ph-bold ph-check"></i> Bereit</> : 'Min. 10 Zeichen'}
                 </span>
                 <span className="text-xs text-slate-400">{formData.grund.length} Zeichen</span>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-white px-6 pb-8 pt-4 flex justify-between items-center mt-auto border-t border-slate-50 z-20">
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)} 
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <i className="ph-bold ph-arrow-left"></i> Zurück
            </button>
          ) : <div />}
          
          {step === 4 && (
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || formData.grund.length < 10}
              className={`
                ml-auto px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 shadow-lg
                ${isSubmitting || formData.grund.length < 10 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-slate-900 hover:bg-blue-600 text-white shadow-slate-200 hover:shadow-blue-200 hover:-translate-y-0.5'
                }
              `}
            >
              {isSubmitting ? 'Sende...' : 'Absenden'} 
              {!isSubmitting && <i className="ph-bold ph-paper-plane-right"></i>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;