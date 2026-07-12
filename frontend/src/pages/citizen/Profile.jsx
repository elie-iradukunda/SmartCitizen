import { useEffect, useState } from 'react';
import { Save, UserCircle2 } from 'lucide-react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
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
      .catch((err) => toast.error(errorMessage(err, 'Could not load profile')));
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
        province: kacyiruDefaults.province,
        district: kacyiruDefaults.district,
        sector: kacyiruDefaults.sector,
        cell: form.cell,
        village: form.village,
        address: form.address,
        preferredLanguage: form.preferredLanguage
      });
      updateUser(updated);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your personal details used for complaint submission and contact." />
      <form onSubmit={submit} className="panel max-w-2xl p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><UserCircle2 size={26} /></span>
          <div>
            <p className="font-bold text-slate-950">{form.email}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Citizen Account</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full Name" value={form.fullName || ''} onChange={(value) => update('fullName', value)} />
          <Field label="Phone" value={form.phone || ''} onChange={(value) => update('phone', value)} />
          <Field label="National ID / Citizen ID" value={form.nationalId || ''} onChange={(value) => update('nationalId', value)} />
          <label>
            <span className="label">Gender</span>
            <select className="input" value={form.gender || ''} onChange={(event) => update('gender', event.target.value)}>
              <option value="">Select gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </label>
          <Field label="Province" value={kacyiruDefaults.province} readOnly />
          <Field label="District" value={kacyiruDefaults.district} readOnly />
          <Field label="Sector" value={kacyiruDefaults.sector} readOnly />
          <label>
            <span className="label">Cell</span>
            <select
              className="input"
              value={form.cell || kacyiruDefaults.cell}
              onChange={(event) => {
                const cell = event.target.value;
                update('cell', cell);
                update('village', villagesForCell(cell)[0] || '');
              }}
            >
              {kacyiruLocation.cells.map((cell) => <option key={cell.name}>{cell.name}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Village</span>
            <select className="input" value={form.village || villagesForCell(form.cell || kacyiruDefaults.cell)[0] || ''} onChange={(event) => update('village', event.target.value)}>
              {villagesForCell(form.cell || kacyiruDefaults.cell).map((village) => <option key={village}>{village}</option>)}
            </select>
          </label>
          <Field label="Address / Street" value={form.address || ''} onChange={(value) => update('address', value)} />
          <label>
            <span className="label">Preferred Language</span>
            <select className="input" value={form.preferredLanguage || 'Kinyarwanda'} onChange={(event) => update('preferredLanguage', event.target.value)}>
              <option>Kinyarwanda</option>
              <option>English</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="btn-primary" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, value, onChange = () => {}, readOnly = false }) => (
  <label>
    <span className="label">{label}</span>
    <input className="input" value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
  </label>
);
