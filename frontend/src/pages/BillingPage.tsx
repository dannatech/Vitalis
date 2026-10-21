import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Payer, TariffItem } from '../api/types';
import InvoicesTab from './billing/InvoicesTab';
import ClaimsTab from './billing/ClaimsTab';
import SettingsTab from './billing/SettingsTab';

type Tab = 'invoices' | 'claims' | 'settings';

const VIEW_ROLES = ['BILLING_OFFICER', 'ADMIN', 'SUPER_ADMIN'];

export default function BillingPage() {
  const { isDemo, user } = useAuth();
  const canView = Boolean(user && VIEW_ROLES.includes(user.role));

  const [tab, setTab] = useState<Tab>('invoices');
  const [payers, setPayers] = useState<Payer[]>([]);
  const [tariffItems, setTariffItems] = useState<TariffItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPayers = useCallback(async () => {
    if (isDemo || !canView) return;
    try {
      const { data } = await apiClient.get<Payer[]>('/billing/payers');
      setPayers(data);
    } catch {
      setLoadError('Could not load billing data — check connectivity.');
    }
  }, [isDemo, canView]);

  const loadTariffItems = useCallback(async () => {
    if (isDemo || !canView) return;
    try {
      const { data } = await apiClient.get<TariffItem[]>('/billing/tariffs');
      setTariffItems(data);
    } catch {
      setLoadError('Could not load billing data — check connectivity.');
    }
  }, [isDemo, canView]);

  useEffect(() => {
    void loadPayers();
    void loadTariffItems();
  }, [loadPayers, loadTariffItems]);

  if (!canView) {
    return (
      <div>
        <h1>Billing</h1>
        <p className="hint">
          Invoicing and claims aren't available for your role. This is visible to billing
          officers and admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Billing</h1>
      </div>
      <p className="subtitle">
        Patient invoicing, payments, and NHIS/HMO claims for your facility.
      </p>

      {isDemo ? (
        <div className="hint">
          Preview mode — billing and claims need a real backend, so they're not available here.
        </div>
      ) : (
        <>
          {loadError && <div className="error-banner">{loadError}</div>}

          <nav className="page-tabs">
            <button type="button" className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}>
              Invoices
            </button>
            <button type="button" className={tab === 'claims' ? 'active' : ''} onClick={() => setTab('claims')}>
              Claims
            </button>
            <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
              Payers & Price List
            </button>
          </nav>

          {tab === 'invoices' && <InvoicesTab payers={payers} tariffItems={tariffItems} />}
          {tab === 'claims' && <ClaimsTab payers={payers} />}
          {tab === 'settings' && (
            <SettingsTab
              payers={payers}
              tariffItems={tariffItems}
              onPayersChanged={loadPayers}
              onTariffItemsChanged={loadTariffItems}
            />
          )}
        </>
      )}
    </div>
  );
}
