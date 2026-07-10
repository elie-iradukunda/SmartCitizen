import { Mail, MapPin, Phone, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader.jsx';

export const About = () => (
  <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <PageHeader title="About SCFCMS" subtitle="A Smart Citizen Feedback and Complaint Management System for citizens, administrative staff, and admins." />
    <div className="grid gap-5 md:grid-cols-3">
      <Info icon={Sparkles} title="Citizen Feedback" text="Citizens submit complaints and feedback, track progress, receive official responses, and rate resolution." />
      <Info icon={Users} title="Administrative Response" text="Administrative staff receive, review, classify, assign, respond, update, and escalate complaints." />
      <Info icon={ShieldCheck} title="Trusted Governance" text="Admins manage users, categories, SLAs, security, routing, analytics, and audit logs." />
    </div>
  </section>
);

export const Contact = () => (
  <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <PageHeader title="Contact Us" subtitle="Reach the SCFCMS support team for complaint-system support." />
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <div className="space-y-5 text-sm text-slate-600">
          <p className="flex items-center gap-3"><Mail size={18} className="text-brand-600" /> support@smartcitizen.rw</p>
          <p className="flex items-center gap-3"><Phone size={18} className="text-brand-600" /> +250 788 456 000</p>
          <p className="flex items-center gap-3"><MapPin size={18} className="text-brand-600" /> Kigali Innovation City, Rwanda</p>
        </div>
      </div>
      <form className="panel grid gap-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="label">Full Name</span><input className="input" placeholder="Your name" /></label>
          <label><span className="label">Email</span><input className="input" placeholder="you@example.com" /></label>
        </div>
        <label><span className="label">Subject</span><input className="input" placeholder="Partnership, support, feedback..." /></label>
        <label><span className="label">Message</span><textarea className="input min-h-32" placeholder="How can we help?" /></label>
        <button type="button" className="btn-primary w-fit">Send Message</button>
      </form>
    </div>
  </section>
);

const Info = ({ icon: Icon, title, text }) => (
  <article className="card p-6">
    <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={21} /></span>
    <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
  </article>
);
