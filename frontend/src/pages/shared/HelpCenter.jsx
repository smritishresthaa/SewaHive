// frontend/src/pages/shared/HelpCenter.jsx
import { useState } from 'react';
import {
  HiCalendarDays,
  HiCreditCard,
  HiShieldCheck,
  HiBolt,
  HiChatBubbleLeftRight,
  HiChevronDown,
  HiUser,
  HiEnvelope,
  HiTag,
  HiCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import api from '../../utils/axios';

const faqData = [
  {
    category: 'Booking',
    items: [
      {
        question: 'How do I book a service on SewaHive?',
        answer:
          "Browse available services by category or search directly. Select a service, choose your preferred date and time slot, review the provider's profile and ratings, then confirm your booking. You will receive a confirmation notification once the provider accepts.",
      },
      {
        question: 'Can I reschedule or cancel a booking?',
        answer:
          'Yes. You can reschedule or cancel a booking before the provider has started work. Go to your booking history, select the booking, and use the Reschedule or Cancel option. Cancellations made 24 hours before the scheduled time are fully refunded.',
      },
      {
        question: 'What happens after a provider accepts my booking?',
        answer:
          'You will receive a notification when your booking is accepted. The payment is held in escrow at this point. You can chat with your provider directly through the in-app messaging system to coordinate any details.',
      },
      {
        question: 'How do I know if a provider is available for emergency services?',
        answer:
          'Providers who have enabled Emergency Available status are shown with a green badge on their profile. When browsing, use the "Emergency" filter to show only providers currently available for urgent requests.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        question: 'How does escrow payment work?',
        answer:
          'When you confirm a booking, your payment is held securely in escrow by SewaHive. The funds are only released to the provider after you mark the service as complete and are satisfied with the work. This protects both you and the provider.',
      },
      {
        question: 'What payment methods are accepted?',
        answer:
          'SewaHive currently supports eSewa as the primary payment method for Nepal-based transactions. Additional payment options may be added in future updates.',
      },
      {
        question: 'When will I receive a refund after cancellation?',
        answer:
          'Refunds for eligible cancellations are processed within 3-5 business days back to your original payment method. You will receive an email confirmation once the refund is initiated.',
      },
      {
        question: 'Is there a platform commission fee?',
        answer:
          'SewaHive charges a small platform commission on each completed booking to cover operational costs, payment processing, and platform maintenance. The exact percentage is shown transparently before you confirm your booking.',
      },
    ],
  },
  {
    category: 'Verification',
    items: [
      {
        question: 'What documents do I need for provider verification?',
        answer:
          'Provider verification requires a valid government-issued photo ID (citizenship card or passport), a selfie holding your ID, and relevant skill or qualification documents for your service category. All documents are reviewed by the SewaHive compliance team.',
      },
      {
        question: 'How long does the verification process take?',
        answer:
          '2-3 business days after all required documents are submitted. You will receive a notification with the outcome once the review is complete.',
      },
      {
        question: 'What is the Skill Credibility badge?',
        answer:
          'The Skill Credibility badge is awarded to providers who submit and receive approval for skill proof documents such as certificates, training records, or professional licenses. It gives clients confidence in your expertise.',
      },
      {
        question: 'Can I offer services before verification is complete?',
        answer:
          'No. Provider accounts must complete KYC verification before services become publicly visible. This ensures quality and trust across the platform.',
      },
    ],
  },
  {
    category: 'Emergency Services',
    items: [
      {
        question: 'How do I enable Emergency Available status?',
        answer:
          'Go to your Provider Dashboard and open the Emergency Toggle page. Switch on the "Emergency Available" toggle. Your availability will show in real-time to clients searching for urgent help. The toggle automatically deactivates after 12 hours.',
      },
      {
        question: 'Is there an additional fee for emergency bookings?',
        answer:
          'Yes. Emergency bookings include a surcharge to compensate providers for the urgency and to cover prioritized platform processing. The surcharge percentage is shown clearly on the booking confirmation screen.',
      },
      {
        question: 'What qualifies as an emergency service?',
        answer:
          'Emergency services are bookings flagged as urgent by the client, typically requiring same-day or immediate response. Providers must explicitly opt in to offer emergency availability and agree to respond within the SLA window.',
      },
      {
        question: 'Can a client request an emergency booking at any time?',
        answer:
          'Clients can submit emergency booking requests at any time. However, the request will only match with providers who currently have Emergency Available status enabled.',
      },
    ],
  },
];

const CATEGORIES = faqData.map((f) => f.category);

const QUICK_LINKS = [
  { Icon: HiCalendarDays, label: 'How to Book a Service' },
  { Icon: HiCreditCard, label: 'Payment & Escrow Guide' },
  { Icon: HiShieldCheck, label: 'Provider Verification Steps' },
  { Icon: HiBolt, label: 'Emergency Services Guide' },
  { Icon: HiChatBubbleLeftRight, label: 'Dispute Resolution Process' },
];

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-white inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function InputWithIcon({ Icon, ...props }) {
  return (
    <div className="relative mb-3">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        {...props}
        className="rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-400 outline-none"
      />
    </div>
  );
}

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [openIndex, setOpenIndex] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeFaq = faqData.find((f) => f.category === activeCategory)?.items || [];
  const filteredFaq = search.trim()
    ? faqData.flatMap((f) => f.items).filter(
        (item) =>
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          item.answer.toLowerCase().includes(search.toLowerCase())
      )
    : activeFaq;

  function updateForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { name, email, subject, message } = form;
    if (!name || !email || !subject || !message) {
      toast.error('All fields are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/support/contact', form);
      toast.success('Message sent successfully.');
      setSubmitted(true);
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ name: '', email: '', subject: '', message: '' });
    setSubmitted(false);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 py-10 px-8">
        <h1 className="text-2xl font-bold text-white mb-1">How can we help you?</h1>
        <p className="text-sm text-emerald-100 mb-5">Search our knowledge base or browse by category</p>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpenIndex(null); }}
          placeholder="Search articles, guides, FAQs..."
          className="rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm placeholder-white/60 text-white px-4 py-2.5 w-full max-w-lg outline-none focus:ring-2 focus:ring-white/40"
        />
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-6 p-6">
        {/* Quick Links */}
        <div className="col-span-12 md:col-span-3">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Quick Links</p>
            <nav>
              {QUICK_LINKS.map(({ Icon, label }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:text-emerald-600 transition text-sm text-gray-700 text-left"
                >
                  <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="col-span-12 md:col-span-6">
          {!search.trim() && (
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {search.trim() && (
            <p className="text-xs text-gray-500 mb-3">
              Showing results for &ldquo;{search}&rdquo;
            </p>
          )}

          <div className="space-y-2">
            {filteredFaq.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No results found.</p>
            )}
            {filteredFaq.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                <button
                  className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition text-left"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                  <span className="text-sm font-medium text-gray-800 pr-4">{item.question}</span>
                  <HiChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openIndex === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === idx && (
                  <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-2">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="col-span-12 md:col-span-3">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4">Contact Support</p>

            {submitted ? (
              <div className="flex flex-col items-center text-center py-6">
                <HiCheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                <p className="text-base font-semibold text-gray-800">Message sent!</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">We will respond within 24 hours.</p>
                <button
                  onClick={resetForm}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <InputWithIcon
                  Icon={HiUser}
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                />
                <InputWithIcon
                  Icon={HiEnvelope}
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                />
                <InputWithIcon
                  Icon={HiTag}
                  type="text"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => updateForm('subject', e.target.value)}
                />
                <textarea
                  rows={4}
                  placeholder="Describe your issue..."
                  value={form.message}
                  onChange={(e) => updateForm('message', e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm w-full focus:ring-2 focus:ring-emerald-400 outline-none resize-none mb-3"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Spinner />}
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
