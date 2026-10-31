import { useMemo, useState } from 'react';
import { ICD10_REFERENCE, type Icd10Category } from '../data/icd10Reference';
import BackButton from '../components/BackButton';

const CATEGORIES: Icd10Category[] = [
  'NCDC Notifiable (epidemic-prone)',
  'Vector-borne & Parasitic',
  'Other Infectious Disease',
  'Maternal & Reproductive Health',
  'Child & Neonatal Health',
  'Chronic / Noncommunicable Disease',
];

export default function Icd10ReferencePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Icd10Category | ''>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ICD10_REFERENCE.filter((e) => {
      const matchesCategory = !category || e.category === category;
      const matchesSearch =
        !q || e.code.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  return (
    <div>
      <BackButton fallback="/dashboard" />
      <div className="page-header">
        <h1>ICD-10 reference</h1>
      </div>
      <p className="subtitle">
        A curated Sub-Saharan Africa clinical reference — epidemic-prone/NCDC-notifiable
        disease, common tropical and parasitic conditions, maternal and child health, and the
        growing noncommunicable disease burden. Not the full ICD-10 standard; use it to look up a
        code, then enter it on the encounter's Diagnoses form.
      </p>

      <div className="inline-form">
        <input
          placeholder="Search by code or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as Icd10Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry) => (
            <tr key={entry.code}>
              <td>
                <strong>{entry.code}</strong>
              </td>
              <td>
                {entry.description}
                {entry.category === 'NCDC Notifiable (epidemic-prone)' && (
                  <span className="badge danger">NCDC notifiable</span>
                )}
              </td>
              <td>{entry.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <p className="empty-state">No matching codes.</p>}
    </div>
  );
}
