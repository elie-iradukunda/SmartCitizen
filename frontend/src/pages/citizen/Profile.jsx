import { useEffect, useState } from 'react';
import { Save, UserCircle2 } from 'lucide-react';
import { endpoints } from '../../api/client.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast, errorMessage } from '../../context/ToastContext.jsx';

const fields = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'province', label: 'Province' },
  { key: 'district', label: 'District' },
  { key: 'sector', label: 'Sector' }
];

export const Profile = () => {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    endpoints.getProfile().then(setForm).catch((err) => toast.error(errorMessage(err, 'Could not load profile')));
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
        gender: form.gender,
        province: form.province,
        district: form.district,
        sector: form.sector
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
          {fields.map((field) => (
            <label key={field.key}>
              <span className="label">{field.label}</span>
              <input className="input" value={form[field.key] || ''} onChange={(event) => update(field.key, event.target.value)} />
            </label>
          ))}
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
