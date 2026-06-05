import React, { useState, useRef } from 'react';
import { ControlParams } from '../../types';
import { CONTROL_PARAMS } from '../../constants';
import { DESCRIPTIONS } from '../equations/descriptions';

// Change this constant to update the access code
const ACCESS_CODE = 'facilitador2026';

interface FacilitatorPanelProps {
  controlParams: ControlParams;
  onChange: (next: ControlParams) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------
type Category = {
  id: string;
  label: string;
  keys: (keyof ControlParams)[];
};

const CATEGORIES: Category[] = [
  {
    id: 'presion_politica',
    label: 'Presión política',
    keys: [
      'Factor_Impulso_Presion_Agricola',
      'Factor_Impulso_Presion_Ambientalista',
      'Factor_Impulso_Presion_Social',
      'Tasa_disipacion_social',
      'Tasa_disipacion_agricola_Nivel_1',
      'Tasa_disipacion_agricola_Nivel_2',
      'Tasa_disipacion_agricola_Nivel_3',
      'Tasa_disipacion_ambientalista_Nivel_1',
      'Tasa_disipacion_ambientalista_Nivel_2',
      'Tasa_disipacion_ambientalista_Nivel_3',
      'Peso_Agricola_Colapso',
      'Peso_Ambientalista_Colapso',
      'Peso_Social_Colapso',
      'Peso_Influencia_Presiones_CP',
      'Peso_Factor_Polarizacion_CP',
      'Factor_Presion_Agricola_PAS',
      'Factor_Presion_Agricola_PGS',
      'Factor_Presion_Agricola_PPAI',
      'Factor_Presion_Agricola_PPEA',
      'Factor_Presion_Ambiental_PAS',
      'Factor_Presion_Ambiental_PCR',
      'Factor_Presion_Ambiental_PGS',
      'Factor_Presion_Ambiental_PAGUA',
      'Factor_Presion_Ambiental_PCN',
      'Factor_Presion_Ambiental_PPAI_Neg',
      'Factor_Presion_Ambiental_PFRA_Neg',
      'Factor_Presion_Ambiental_PSE_Neg',
      'Factor_Presion_Social_PAS',
      'Factor_Presion_Social_PAGUA',
      'Factor_Presion_Social_PCN',
      'Factor_Presion_Social_PCR',
      'Factor_Presion_Social_PPAI_Neg',
      'Factor_Presion_Social_PPIE_Neg',
      'Factor_Presion_Social_PFRA_Neg',
      'Umbral_Influencia_Agricola_Nivel_1',
      'Umbral_Influencia_Agricola_Nivel_2',
      'Umbral_Influencia_Agricola_Nivel_3',
      'Amplificacion_mediatica_social_Nivel_1',
      'Amplificacion_mediatica_social_Nivel_2',
      'Amplificacion_mediatica_social_Nivel_3',
    ],
  },
  {
    id: 'sensibilidades',
    label: 'Sensibilidades de indicadores',
    keys: [
      'Factor_Impacto_Politicas_y_Presiones_en_Biodiversidad_Peso',
      'Factor_Impacto_Usos_del_Suelo_en_Biodiversidad_Peso',
      'Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Alimentaria_Peso',
      'Factor_Impacto_Usos_del_Suelo_en_Seguridad_Alimentaria_Peso',
      'Impacto_Biodiversidad_en_Seguridad_Alimentaria_Peso',
      'Factor_Impacto_Politicas_y_Presiones_en_Seguridad_Economica_Peso',
      'Factor_Impacto_Usos_del_Suelo_en_Seguridad_Economica_Peso',
      'Impacto_Biodiversidad_en_SE_Peso',
      'Factor_Impacto_Politicas_y_Presiones_en_Bienestar_Peso',
      'Factor_Impacto_Usos_en_Bienestar_Peso',
      'Impacto_Submodulos_en_Bienestar_Peso',
      'Impacto_Sinergias_Antagonismos_Bienestar_Peso',
      'Punto_Inflexion_SA_Biodiversidad',
      'Punto_Inflexion_SE_Biodiversidad',
      'Punto_Inflexion_BS_Biodiversidad',
      'Punto_Inflexion_BS_SA',
      'Punto_Inflexion_BS_SE',
      'Capacidad_Maxima_SA_Impacto_Biodiversidad',
      'Capacidad_Maxima_SA_Impacto_SE',
      'Capacidad_Maxima_BS_Impacto_Biodiversidad',
      'Capacidad_Maxima_BS_Impacto_SA',
      'Capacidad_Maxima_BS_Impacto_SE',
      'Sensibilidad_PP_Agricola_SegEconomica',
      'Umbral_PP_Agricola_SegEconomica',
      'Sensibilidad_PP_Agricola_SegAlimentaria',
      'Umbral_PP_Agricola_SegAlimentaria',
      'Sensibilidad_PP_Ambiental_Biodiversidad',
      'Umbral_PP_Ambiental_Biodiversidad',
      'Sensibilidad_PP_Ambiental_CO2PerCapita',
      'Umbral_PP_Ambiental_CO2PerCapita',
      'Sensibilidad_PP_Social_BienestarSocial',
      'Umbral_PP_Social_BienestarSocial',
      'Factor_sensibilidad_Indicador_eficiencia',
      'Umbral_polarizacion',
      'Referencia_Max_CO2_per_Capita_Puntaje',
    ],
  },
  {
    id: 'carbono_tierra',
    label: 'Carbono y tierra',
    keys: [
      'Max_Emisiones_Referencia_Anual',
      'FACTOR_C_A_CO2EQ',
      'Tasa_Transicion_Emisiones_Base',
      'Punto_Saturacion_Emisiones',
      'CO2_EMISSIONS_SCALING_FACTOR',
      'Tasa_de_BNNP_a_BNP_Base',
      'Tasa_de_BNNP_a_CA_Base',
      'Tasa_de_BNNP_a_CC_Base',
      'Tasa_de_CA_a_BNNP_Base',
      'Tasa_de_CC_a_CA_Base',
      'Factor_Reduccion_Emisiones_Renovables_PCN',
      'Factor_Aumento_Secuestro_CAC_PCN',
      'Factor_Aumento_Emisiones_Fosiles_PSE',
      'Factor_Aumento_Emisiones_AgroIntensivo_PPAI',
      'Peso_Ant_C_SE_Carbono_Stella',
      'Peso_Sin_CR_C_Carbono_Stella',
    ],
  },
  {
    id: 'pesos_puntaje',
    label: 'Pesos de puntaje',
    keys: [
      'Ponderacion_CO2_Nivel_1',
      'Ponderacion_CO2_Nivel_2',
      'Ponderacion_CO2_Nivel_3',
      'Ponderacion_Externalidades_Nivel_1',
      'Ponderacion_Externalidades_Nivel_2',
      'Ponderacion_Externalidades_Nivel_3',
      'Ponderacion_Usos_coberturas_Nivel_1',
      'Ponderacion_Usos_coberturas_Nivel_2',
      'Ponderacion_Usos_coberturas_Nivel_3',
      'Peso_Biodiversidad_Ext',
      'Peso_Seguridad_Alimentaria_Ext',
      'Peso_Seguridad_Economica_Ext',
      'Peso_Bienestar_Social_Ext',
      'Peso_BNNP_Nivel_1',
      'Peso_BNP_Nivel_1',
      'Peso_CA_Nivel_1',
      'Peso_CC_Nivel_1',
      'Peso_PF_Nivel_1',
      'Peso_PRG_Nivel_1',
    ],
  },
  {
    id: 'economia',
    label: 'Economía y finanzas',
    keys: [
      'Tasa_Impositiva_General_Sobre_PBI',
      'Tasa_Base_Crecimiento_PBI',
      'Tasa_Crecimiento_Poblacional_Base',
      'Tasa_de_interes_Nivel_1',
      'Tasa_de_interes_Nivel_2',
      'Tasa_de_interes_Nivel_3',
      'Pago_deuda_anual_Nivel_1',
      'Pago_deuda_anual_Nivel_2',
      'Pago_deuda_anual_Nivel_3',
      'Ano_Activacion_Prestamo',
      'Monto_del_Prestamo_Unico',
      'Max_Additional_Tax_Rate_Percentage',
      'EcoSec_Reduction_Factor_Per_Tax_Point',
      'SocialConflict_Increase_Factor_Per_Tax_Point',
      'PBIGrowth_Reduction_Factor_Per_Tax_Point',
      'PPSocial_Increase_Factor_Per_Tax_Point',
    ],
  },
  {
    id: 'decaimiento',
    label: 'Decaimiento de políticas',
    keys: [
      'Duracion_Efecto_Al',
      'Duracion_Efecto_CBN',
      'Duracion_Efecto_CN',
      'Duracion_Efecto_EA',
      'Duracion_Efecto_GRH',
      'Duracion_Efecto_GS',
      'Duracion_Efecto_IE',
      'Duracion_Efecto_NAF',
      'Duracion_Efecto_PA',
      'Duracion_Efecto_SE',
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inferRange(key: keyof ControlParams, defaultVal: number): { min: number; max: number; step: number } {
  const abs = Math.abs(defaultVal);

  // Special cases
  if (key === 'Ano_Activacion_Prestamo') return { min: 2025, max: 2050, step: 1 };
  if (key === 'Monto_del_Prestamo_Unico') return { min: 0, max: 20000000, step: 100000 };
  if (key === 'Max_Emisiones_Referencia_Anual') return { min: 0, max: 50000, step: 100 };
  if (key === 'CO2_EMISSIONS_SCALING_FACTOR') return { min: 0, max: 200000, step: 1000 };
  if (key === 'Factor_Aumento_Secuestro_CAC_PCN') return { min: 0, max: 500, step: 1 };

  if (abs === 0) return { min: -1, max: 1, step: 0.01 };

  // Large integer-like values
  if (abs >= 1000) return { min: defaultVal < 0 ? defaultVal * 3 : 0, max: abs * 3, step: Math.max(1, Math.round(abs / 100)) };

  // Values >= 1 that look like integers or small multipliers
  if (abs >= 1 && Number.isInteger(defaultVal)) {
    return { min: defaultVal < 0 ? defaultVal * 3 : 0, max: abs * 4, step: 1 };
  }

  // Non-integer >= 1 (e.g., 3.67)
  if (abs >= 1) return { min: defaultVal < 0 ? defaultVal * 3 : 0, max: abs * 3, step: 0.01 };

  // Fractional values < 1
  if (abs >= 0.1) return { min: defaultVal < 0 ? -abs * 3 : 0, max: abs * 3, step: 0.01 };

  // Very small fractions
  return { min: defaultVal < 0 ? -abs * 5 : 0, max: abs * 5, step: 0.0001 };
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ');
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1000) return val.toLocaleString('es-AR');
  if (Number.isInteger(val)) return String(val);
  // Show up to 4 significant decimal places without trailing zeros
  return parseFloat(val.toPrecision(4)).toString();
}

// ---------------------------------------------------------------------------
// Tooltip component
// ---------------------------------------------------------------------------
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-600 text-gray-300 text-xs leading-none flex items-center justify-center hover:bg-custom-accent hover:text-white focus:outline-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Ayuda"
      >
        ?
      </button>
      {visible && (
        <span className="absolute z-50 left-6 top-0 w-64 bg-gray-900 border border-gray-600 text-gray-200 text-xs rounded p-2 shadow-lg pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Single parameter row
// ---------------------------------------------------------------------------
interface ParamRowProps {
  paramKey: keyof ControlParams;
  value: number;
  onChangeValue: (key: keyof ControlParams, val: number) => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ paramKey, value, onChangeValue }) => {
  const defaultVal = CONTROL_PARAMS[paramKey] as number;
  const { min, max, step } = inferRange(paramKey, defaultVal);
  const description: string = (DESCRIPTIONS as Record<string, string>)[paramKey as string] ?? 'Sin descripción disponible';

  const [inputText, setInputText] = useState<string>('');
  const [editing, setEditing] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeValue(paramKey, parseFloat(e.target.value));
  };

  const handleInputFocus = () => {
    setEditing(true);
    setInputText(String(value));
  };

  const handleInputBlur = () => {
    setEditing(false);
    const parsed = parseFloat(inputText);
    if (!isNaN(parsed)) {
      onChangeValue(paramKey, parsed);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-700 last:border-b-0">
      <span className="text-xs text-gray-300 w-56 shrink-0 leading-tight">
        {formatLabel(paramKey as string)}
        <Tooltip text={description} />
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="flex-1 accent-custom-accent h-1.5"
      />
      <input
        type="text"
        className="w-20 text-xs bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-gray-100 text-right focus:outline-none focus:border-custom-accent"
        value={editing ? inputText : formatValue(value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onChange={(e) => editing ? setInputText(e.target.value) : undefined}
        onKeyDown={handleInputKeyDown}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const FacilitatorPanel: React.FC<FacilitatorPanelProps> = ({ controlParams, onChange, onClose }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [accessError, setAccessError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Access gate ----
  const handleAccess = () => {
    if (codeInput === ACCESS_CODE) {
      setUnlocked(true);
      setAccessError('');
    } else {
      setAccessError('Codigo incorrecto. Verificá que no haya espacios adicionales.');
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAccess();
  };

  // ---- Param change ----
  const handleParamChange = (key: keyof ControlParams, val: number) => {
    onChange({ ...controlParams, [key]: val });
  };

  // ---- Restore defaults ----
  const handleRestoreDefaults = () => {
    onChange({ ...CONTROL_PARAMS });
    setImportWarning(null);
  };

  // ---- Export preset ----
  const handleExport = () => {
    const json = JSON.stringify(controlParams, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decarbonation_preset_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Defer revocation so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // ---- Import preset ----
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as Partial<ControlParams>;
        const defaultKeys = Object.keys(CONTROL_PARAMS) as (keyof ControlParams)[];
        const parsedKeys = Object.keys(parsed) as (keyof ControlParams)[];

        const missingKeys = defaultKeys.filter((k) => !parsedKeys.includes(k));
        const extraKeys = parsedKeys.filter((k) => !defaultKeys.includes(k));

        let warning: string | null = null;
        if (missingKeys.length > 0 || extraKeys.length > 0) {
          const parts: string[] = [];
          if (missingKeys.length > 0) parts.push(`Claves faltantes (${missingKeys.length}): se usaron los defaults.`);
          if (extraKeys.length > 0) parts.push(`Claves desconocidas ignoradas (${extraKeys.length}).`);
          warning = parts.join(' ');
        }

        // Merge: defaults for missing keys, parsed for matching keys
        const merged: ControlParams = { ...CONTROL_PARAMS };
        for (const k of defaultKeys) {
          if (k in parsed && typeof parsed[k] === 'number') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (merged as unknown as Record<string, number>)[k as string] = parsed[k] as number;
          }
        }

        onChange(merged);
        setImportWarning(warning);
      } catch {
        setImportWarning('Error al parsear el archivo JSON. Asegurate de que sea un preset valido.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  // ---- Active category params ----
  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0];

  // ---------------------------------------------------------------------------
  // Render: access gate
  // ---------------------------------------------------------------------------
  if (!unlocked) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4">
        <div className="bg-custom-light-gray rounded-lg shadow-2xl w-full max-w-sm p-8 text-gray-100 animate-fade-in-scale-up">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-custom-accent">Panel Modo Facilitador</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
              aria-label="Cerrar"
            >
              &times;
            </button>
          </div>
          <p className="text-sm text-gray-300 mb-5">
            Panel exclusivo para facilitadores. Ingresa el codigo de acceso.
          </p>
          <input
            type="password"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100 mb-3 focus:outline-none focus:border-custom-accent"
            placeholder="Codigo de acceso"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={handleCodeKeyDown}
            autoFocus
          />
          {accessError && (
            <p className="text-red-400 text-xs mb-3">{accessError}</p>
          )}
          <button
            onClick={handleAccess}
            className="w-full bg-custom-accent hover:bg-blue-600 text-white font-semibold py-2 rounded transition-colors"
          >
            Acceder
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: main panel
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4">
      <div className="bg-custom-light-gray rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col text-gray-100 animate-fade-in-scale-up">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-custom-accent">Panel Modo Facilitador</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDefaults}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded transition-colors"
              title="Restaurar todos los parámetros a sus valores por defecto"
            >
              Restaurar defaults
            </button>
            <button
              onClick={handleExport}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded transition-colors"
              title="Exportar configuración actual como JSON"
            >
              Exportar preset JSON
            </button>
            <button
              onClick={handleImportClick}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1 rounded transition-colors"
              title="Importar configuración desde archivo JSON"
            >
              Importar preset
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none ml-2"
              aria-label="Cerrar panel"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Import warning */}
        {importWarning && (
          <div className="bg-yellow-900 border-l-4 border-yellow-400 text-yellow-200 text-xs px-4 py-2 shrink-0">
            <strong>Advertencia:</strong> {importWarning}
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-0 shrink-0 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-t font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-custom-accent text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Parameter list */}
        <div className="overflow-y-auto flex-grow px-5 py-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          <div className="text-xs text-gray-500 mb-2">
            {currentCategory.keys.length} parámetros en esta categoría
          </div>
          {currentCategory.keys.map((key) => {
            const val = controlParams[key] as number;
            return (
              <ParamRow
                key={key as string}
                paramKey={key}
                value={val}
                onChangeValue={handleParamChange}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FacilitatorPanel;
