export type Icd10Category =
  | 'NCDC Notifiable (epidemic-prone)'
  | 'Vector-borne & Parasitic'
  | 'Other Infectious Disease'
  | 'Maternal & Reproductive Health'
  | 'Child & Neonatal Health'
  | 'Chronic / Noncommunicable Disease';

export interface Icd10Entry {
  code: string;
  description: string;
  category: Icd10Category;
}

/**
 * Curated ICD-10 reference for Sub-Saharan Africa clinical priorities — not
 * the full ICD-10 standard (14,000+ codes), just the conditions clinicians
 * actually see often in this region: epidemic-prone/notifiable disease,
 * tropical/vector-borne and parasitic disease, maternal and child health,
 * and the rising noncommunicable disease burden.
 *
 * The "NCDC Notifiable" entries use the exact same code + description text
 * as backend/prisma/seed.ts's NOTIFIABLE_DISEASES list on purpose: picking
 * one here and submitting it is what makes EncountersService.addDiagnosis's
 * exact-string match against the notifiable_diseases table actually fire
 * (free-typed codes are easy to get subtly wrong — wrong case, stray
 * whitespace, a missing decimal — and silently fail to flag).
 */
export const ICD10_REFERENCE: Icd10Entry[] = [
  // ---- NCDC Notifiable (epidemic-prone) — keep in sync with seed.ts ----
  { code: 'A00', description: 'Cholera', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'A98.4', description: 'Lassa fever', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'B05', description: 'Measles', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'A39', description: 'Cerebrospinal meningitis', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'A95', description: 'Yellow fever', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'B04', description: 'Mpox (Monkeypox)', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'A80', description: 'Acute flaccid paralysis (Polio)', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'U07.1', description: 'COVID-19', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'A01.0', description: 'Typhoid fever', category: 'NCDC Notifiable (epidemic-prone)' },
  { code: 'B50', description: 'Malaria (severe/complicated)', category: 'NCDC Notifiable (epidemic-prone)' },

  // ---- Vector-borne & Parasitic ----
  { code: 'B51', description: 'Malaria due to Plasmodium vivax', category: 'Vector-borne & Parasitic' },
  { code: 'B52', description: 'Malaria due to Plasmodium malariae', category: 'Vector-borne & Parasitic' },
  { code: 'B53', description: 'Other parasitologically confirmed malaria', category: 'Vector-borne & Parasitic' },
  { code: 'B54', description: 'Malaria, unspecified', category: 'Vector-borne & Parasitic' },
  { code: 'B65.0', description: 'Schistosomiasis haematobium (urinary)', category: 'Vector-borne & Parasitic' },
  { code: 'B65.1', description: 'Schistosomiasis mansoni (intestinal)', category: 'Vector-borne & Parasitic' },
  { code: 'B73', description: 'Onchocerciasis (river blindness)', category: 'Vector-borne & Parasitic' },
  { code: 'B74.0', description: 'Bancroftian filariasis', category: 'Vector-borne & Parasitic' },
  { code: 'B56.9', description: 'African trypanosomiasis, unspecified (sleeping sickness)', category: 'Vector-borne & Parasitic' },
  { code: 'B55.0', description: 'Visceral leishmaniasis (kala-azar)', category: 'Vector-borne & Parasitic' },
  { code: 'B72', description: 'Dracunculiasis (Guinea worm disease)', category: 'Vector-borne & Parasitic' },
  { code: 'A90', description: 'Dengue fever', category: 'Vector-borne & Parasitic' },
  { code: 'A92.0', description: 'Chikungunya virus disease', category: 'Vector-borne & Parasitic' },
  { code: 'B76.9', description: 'Hookworm disease, unspecified', category: 'Vector-borne & Parasitic' },
  { code: 'B77.9', description: 'Ascariasis, unspecified', category: 'Vector-borne & Parasitic' },
  { code: 'B79', description: 'Trichuriasis (whipworm disease)', category: 'Vector-borne & Parasitic' },
  { code: 'B68.9', description: 'Taeniasis, unspecified', category: 'Vector-borne & Parasitic' },

  // ---- Other Infectious Disease ----
  { code: 'A09', description: 'Infectious gastroenteritis and colitis (diarrhoeal disease)', category: 'Other Infectious Disease' },
  { code: 'A15.0', description: 'Tuberculosis of lung', category: 'Other Infectious Disease' },
  { code: 'A16.2', description: 'TB of lung, bacteriologically/histologically unconfirmed', category: 'Other Infectious Disease' },
  { code: 'B20', description: 'HIV disease resulting in infectious/parasitic disease (AIDS)', category: 'Other Infectious Disease' },
  { code: 'Z21', description: 'Asymptomatic HIV infection status', category: 'Other Infectious Disease' },
  { code: 'B18.1', description: 'Chronic viral hepatitis B', category: 'Other Infectious Disease' },
  { code: 'B18.2', description: 'Chronic viral hepatitis C', category: 'Other Infectious Disease' },
  { code: 'B15.9', description: 'Hepatitis A without hepatic coma', category: 'Other Infectious Disease' },
  { code: 'A33', description: 'Tetanus neonatorum', category: 'Other Infectious Disease' },
  { code: 'A35', description: 'Other tetanus', category: 'Other Infectious Disease' },
  { code: 'A36.9', description: 'Diphtheria, unspecified', category: 'Other Infectious Disease' },
  { code: 'A37.9', description: 'Whooping cough, unspecified organism', category: 'Other Infectious Disease' },
  { code: 'A30.9', description: 'Leprosy, unspecified', category: 'Other Infectious Disease' },
  { code: 'A71.9', description: 'Trachoma, unspecified', category: 'Other Infectious Disease' },
  { code: 'A82.9', description: 'Rabies, unspecified', category: 'Other Infectious Disease' },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Other Infectious Disease' },
  { code: 'A41.9', description: 'Sepsis, unspecified organism', category: 'Other Infectious Disease' },
  { code: 'B37.0', description: 'Candidal stomatitis (oral thrush)', category: 'Other Infectious Disease' },

  // ---- Maternal & Reproductive Health ----
  { code: 'O14.1', description: 'Severe pre-eclampsia', category: 'Maternal & Reproductive Health' },
  { code: 'O15.9', description: 'Eclampsia, unspecified as to time period', category: 'Maternal & Reproductive Health' },
  { code: 'O72.1', description: 'Other immediate postpartum haemorrhage', category: 'Maternal & Reproductive Health' },
  { code: 'O64.9', description: 'Obstructed labour, unspecified', category: 'Maternal & Reproductive Health' },
  { code: 'O23.9', description: 'Unspecified infection of genitourinary tract in pregnancy', category: 'Maternal & Reproductive Health' },
  { code: 'O99.0', description: 'Anaemia complicating pregnancy, childbirth and the puerperium', category: 'Maternal & Reproductive Health' },
  { code: 'O03.9', description: 'Complete or unspecified spontaneous abortion, without complication', category: 'Maternal & Reproductive Health' },
  { code: 'Z34.9', description: 'Supervision of normal pregnancy, unspecified', category: 'Maternal & Reproductive Health' },
  { code: 'O80', description: 'Single spontaneous delivery', category: 'Maternal & Reproductive Health' },

  // ---- Child & Neonatal Health ----
  { code: 'P07.3', description: 'Other preterm infants (low birth weight)', category: 'Child & Neonatal Health' },
  { code: 'P36.9', description: 'Bacterial sepsis of newborn, unspecified', category: 'Child & Neonatal Health' },
  { code: 'P59.9', description: 'Neonatal jaundice, unspecified', category: 'Child & Neonatal Health' },
  { code: 'E40', description: 'Kwashiorkor (severe protein-energy malnutrition)', category: 'Child & Neonatal Health' },
  { code: 'E41', description: 'Nutritional marasmus', category: 'Child & Neonatal Health' },
  { code: 'E43', description: 'Unspecified severe protein-energy malnutrition', category: 'Child & Neonatal Health' },
  { code: 'E50.9', description: 'Vitamin A deficiency, unspecified', category: 'Child & Neonatal Health' },
  { code: 'D50.9', description: 'Iron deficiency anaemia, unspecified', category: 'Child & Neonatal Health' },
  { code: 'J21.9', description: 'Acute bronchiolitis, unspecified', category: 'Child & Neonatal Health' },

  // ---- Chronic / Noncommunicable Disease ----
  { code: 'D57.0', description: 'Sickle-cell anaemia with crisis', category: 'Chronic / Noncommunicable Disease' },
  { code: 'D57.1', description: 'Sickle-cell anaemia without crisis', category: 'Chronic / Noncommunicable Disease' },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'Chronic / Noncommunicable Disease' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Chronic / Noncommunicable Disease' },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Chronic / Noncommunicable Disease' },
  { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', category: 'Chronic / Noncommunicable Disease' },
  { code: 'J45.9', description: 'Asthma, unspecified', category: 'Chronic / Noncommunicable Disease' },
  { code: 'N18.9', description: 'Chronic kidney disease, unspecified', category: 'Chronic / Noncommunicable Disease' },
  { code: 'C53.9', description: 'Malignant neoplasm of cervix uteri, unspecified', category: 'Chronic / Noncommunicable Disease' },
];

export const NCDC_NOTIFIABLE_CODES = new Set(
  ICD10_REFERENCE.filter((e) => e.category === 'NCDC Notifiable (epidemic-prone)').map((e) => e.code),
);

export function searchIcd10(query: string, limit = 8): Icd10Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ICD10_REFERENCE.filter(
    (e) => e.code.toLowerCase().startsWith(q) || e.description.toLowerCase().includes(q),
  ).slice(0, limit);
}
