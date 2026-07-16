import { useEffect, useState } from 'react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { PageTitle } from '../../components/Ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';
import { kacyiruDefaults, kacyiruLocation, villagesForCell } from '../../data/kacyiruLocations.js';

export const Profile = () => {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    endpoints.getProfile()
      .then((profile) => setForm({
        ...profile,
        ...kacyiruDefaults,
        cell: profile.cell || kacyiruDefaults.cell,
        village: profile.village || kacyiruDefaults.village,
        preferredLanguage: profile.preferredLanguage || 'Kinyarwanda'
      }))
      .catch((err) => toast.error(errorMessage(err, 'Could not load your profile')));
  }, []);

  if (!form) return <LoadingState />;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await endpoints.updateProfile({
        fullName: form.fullName,
        phone: form.phone,
        nationalId: form.nationalId,
        gender: form.gender,
        ...kacyiruDefaults,
        cell: form.cell,
        village: form.village,
        address: form.address,
        preferredLanguage: form.preferredLanguage
      });
      updateUser(updated);
      toast.success('Your profile was saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save your profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      <PageTitle title="My profile" subtitle="These details are attached to every complaint you submit, so you never type them twice." />
      <form onSubmit={submit} className="card" style={{ marginTop: 18, maxWidth: 680 }}>
        <p className="card-t">{form.fullName}</p>
        <small className="hint">{form.email}</small>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginTop: 16 }}>
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" value={form.fullName || ''} onChange={(event) => update('fullName', event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="profile-phone">Phone</label>
            <input id="profile-phone" className="input" value={form.phone || ''} onChange={(event) => update('phone', event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="nationalId">National ID</label>
            <input id="nationalId" className="input" value={form.nationalId || ''} onChange={(event) => update('nationalId', event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="gender">Gender</label>
            <select id="gender" className="input" value={form.gender || ''} onChange={(event) => update('gender', event.target.value)}>
              <option value="">Not stated</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="profile-cell">Cell</label>
            <select
              id="profile-cell"
              className="input"
              value={form.cell}
              onChange={(event) => {
                update('cell', event.target.value);
                update('village', villagesForCell(event.target.value)[0] || '');
              }}
            >
              {kacyiruLocation.cells.map((cell) => <option key={cell.name}>{cell.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="profile-village">Village</label>
            <select id="profile-village" className="input" value={form.village} onChange={(event) => update('village', event.target.value)}>
              {villagesForCell(form.cell).map((village) => <option key={village}>{village}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="address">Address / street</label>
            <input id="address" className="input" value={form.address || ''} onChange={(event) => update('address', event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="language">Preferred language</label>
            <select id="language" className="input" value={form.preferredLanguage} onChange={(event) => update('preferredLanguage', event.target.value)}>
              <option>Kinyarwanda</option>
              <option>English</option>
            </select>
          </div>
        </div>

        <small className="hint" style={{ marginTop: 12 }}>Case study area: Kacyiru Sector, Gasabo District, Kigali City.</small>

        <button className="btn" style={{ marginTop: 16 }} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
};
