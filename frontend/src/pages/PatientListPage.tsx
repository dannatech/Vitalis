import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/offlineDb';
import { runSync } from '../sync/syncEngine';

export default function PatientListPage() {
  const [search, setSearch] = useState('');

  useEffect(() => {
    void runSync();
  }, []);

  const patients = useLiveQuery(async () => {
    const all = await db.patients.orderBy('surname').toArray();
    if (!search.trim()) return all;
    const term = search.trim().toLowerCase();
    return all.filter(
      (p) =>
        p.surname.toLowerCase().includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.mrn.toLowerCase().includes(term),
    );
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <h1>Patients</h1>
        <Link className="button" to="/patients/register">
          Register new patient
        </Link>
      </div>

      <input
        className="search-input"
        placeholder="Search by name or MRN…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="data-table">
        <thead>
          <tr>
            <th>MRN</th>
            <th>Name</th>
            <th>Sex</th>
            <th>Date of birth</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {(patients ?? []).map((p) => (
            <tr key={p.id}>
              <td>{p.mrn}</td>
              <td>
                <Link to={`/patients/${p.id}`}>
                  {p.surname}, {p.firstName}
                </Link>
              </td>
              <td>{p.sex}</td>
              <td>{new Date(p.dateOfBirth).toLocaleDateString()}</td>
              <td>{p.phone ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {patients?.length === 0 && <p className="empty-state">No patients found.</p>}
    </div>
  );
}
