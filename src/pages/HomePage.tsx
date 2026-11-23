import React, { useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Clock,
  Copy,
  FileText,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Tag,
  Video,
  X,
  Zap,
} from 'lucide-react';
import {
  ContactInquiry,
  PageId,
  Product,
  ProductPole,
  StoreSettings,
} from '../types/app';
import {
  BeverageIllustration,
  GisArchitecturalLogo,
  HardwareIllustration,
} from '../components/BrandIllustrations';

interface HomePageProps {
  settings: StoreSettings;
  products: Product[];
  inquiries: ContactInquiry[];
  onNavigate: (page: PageId, poleFilter?: ProductPole | 'separated') => void;
  onAddInquiry: (inquiry: ContactInquiry) => void;
}

const COMMITMENT_META = [
  {
    icon: ShieldCheck,
    detail:
      'Matériaux normalisés pour vos chantiers et boissons conservées dans des conditions optimales.',
  },
  {
    icon: Tag,
    detail:
      'Grilles tarifaires séparées entre Ciment & Quincaillerie et Vente de Boissons, au détail comme en gros.',
  },
  {
    icon: MessageSquare,
    detail:
      'Accompagnement technique sur place pour évaluer vos quantités et choisir les bons produits.',
  },
  {
    icon: Zap,
    detail:
      'Préparation rapide de vos factures, devis, chargements et livraisons dès votre appel.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  products,
  inquiries,
  onNavigate,
  onAddInquiry,
}) => {
  const { poster } = settings;
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pole, setPole] = useState<ProductPole | 'tous'>('tous');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSent, setFormSent] = useState(false);
  const [isStorefrontLightboxOpen, setIsStorefrontLightboxOpen] =
    useState(false);

  const cimentCount = products.filter((p) => p.pole === 'ciment').length;
  const hardwareCount = products.filter(
    (p) => p.pole === 'quincaillerie'
  ).length;
  const beverageCount = products.filter((p) => p.pole === 'boissons').length;

  const handleCopyPhone = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedPhone(num);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch {
      setCopiedPhone(null);
    }
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSent(false);

    if (name.trim().length < 2) {
      setFormError('Veuillez entrer votre nom ou celui de votre entreprise.');
      return;
    }
    if (phone.replace(/\s+/g, '').length < 8) {
      setFormError('Veuillez saisir un numéro de téléphone valide.');
      return;
    }
    if (message.trim().length < 5) {
      setFormError('Précisez brièvement votre besoin ou les articles recherchés.');
      return;
    }

    onAddInquiry({
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: name.trim(),
      phone: phone.trim(),
      pole,
      message: message.trim(),
    });

    setName('');
    setPhone('');
    setMessage('');
    setFormSent(true);
  };

  return (
    <div className="space-y-14 pb-16">
      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <GisArchitecturalLogo
                acronym={poster.brandAcronym}
                primaryColor={settings.theme === 'dark' ? '#F8FAFC' : '#0F2342'}
                accentColor="#D9531E"
                className="h-12 w-auto shrink-0"
              />
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {poster.tagline}
              </span>
            </div>

            <h1
              className="font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.08]"
              style={{
                fontSize: 'clamp(2.1rem, 3.8vw, 3.35rem)',
                textWrap: 'balance',
              }}
            >
              Quincaillerie, Ciment & Vente de Boissons en gros et détail.
            </h1>

            <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {poster.closingSlogan} Consultez nos tarifs séparés Ciment & Quincaillerie et Boissons, établissez vos devis ou factures et coordonnez vos livraisons en temps réel.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('catalog', 'separated')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Tarifs séparés & Catalogue
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('invoices')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                Factures & Devis
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Studio d’affiche
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {poster.phones[0]} / {poster.phones[1]}
              </span>
              <span aria-hidden="true">·</span>
              <span>Gare TSR · Alignement Agence Orange</span>
              <span aria-hidden="true">·</span>
              <span>{settings.hoursWeekdays}</span>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-[#F8F7F4] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#D9531E]">
                  01 · {cimentCount} ciment · {hardwareCount} quincaillerie
                </span>
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Ciment & {poster.hardware.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {poster.hardware.subtitle}
                </p>
              </div>
              <div className="w-28 h-20 shrink-0">
                <HardwareIllustration
                  primaryColor={settings.theme === 'dark' ? '#E2E8F0' : '#0F2342'}
                  secondaryColor="#D9531E"
                  surfaceColor="transparent"
                />
              </div>
            </div>

            <div className="bg-[#EFF4F9] dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                  02 · {beverageCount} références boissons
                </span>
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  {poster.beverages.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {poster.beverages.subtitle}
                </p>
              </div>
              <div className="w-28 h-20 shrink-0">
                <BeverageIllustration
                  primaryColor={settings.theme === 'dark' ? '#E2E8F0' : '#0F2342'}
                  secondaryColor="#0284C7"
                  surfaceColor="transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Separated Divisions Detail */}
      <section className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ciment & Quincaillerie Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-[#D9531E]">
                    01 · Tarifs Ciment & Quincaillerie
                  </span>
                  <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-0.5">
                    {poster.hardware.title}
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {poster.hardware.subtitle}
                </span>
              </div>

              <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                {poster.hardware.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="py-3 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono-tabular text-xs font-bold text-[#D9531E]">
                        0{idx + 1}
                      </span>
                      <span>{item}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          'catalog',
                          idx === 0 ? 'ciment' : 'quincaillerie'
                        )
                      }
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Voir tarifs
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('catalog', 'ciment')}
                className="py-2.5 px-4 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
              >
                Prix Ciment ({cimentCount})
              </button>
              <button
                type="button"
                onClick={() => onNavigate('catalog', 'quincaillerie')}
                className="py-2.5 px-4 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Quincaillerie ({hardwareCount})
              </button>
            </div>
          </div>

          {/* Boissons Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                    02 · Tarifs Boissons
                  </span>
                  <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-0.5">
                    {poster.beverages.title}
                  </h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {poster.beverages.subtitle}
                </span>
              </div>

              <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                {poster.beverages.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="py-3 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono-tabular text-xs font-bold text-[#0369A1] dark:text-[#38BDF8]">
                        0{idx + 1}
                      </span>
                      <span>{item}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('catalog', 'boissons')}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Voir tarifs
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('catalog', 'boissons')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors cursor-pointer"
            >
              Explorer les prix Boissons ({beverageCount})
            </button>
          </div>
        </div>
      </section>

      {/* 4 Commitments */}
      <section className="max-w-[1200px] mx-auto px-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {poster.commitments.map((commitment, idx) => {
            const meta = COMMITMENT_META[idx % COMMITMENT_META.length];
            const Icon = meta.icon;
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Icon className="w-4 h-4 text-[#D9531E] shrink-0" />
                  <h3 className="font-display font-bold text-base">
                    {commitment}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {meta.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Localisation, Aperçu Réel, Horaires & Contact Form */}
      <section
        id="contact-acces"
        className="max-w-[1200px] mx-auto px-6 space-y-8"
      >
        {/* Visual Storefront & Panoramic Location Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 lg:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D9531E]">
                Repérage visuel du magasin
              </p>
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-0.5">
                Aperçu réel du point de vente & accès
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Près de la gare TSR · Alignement agence Orange · Vers la sous-préfecture
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Storefront Photo */}
            <figure className="space-y-2.5">
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.32.01_510dda49.jpeg"
                  alt="Façade réelle du magasin Galilée Ivoire Service : pôle Ciment et Quincaillerie à gauche, dépôt de boissons à droite"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setIsStorefrontLightboxOpen(true)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-950/75 hover:bg-slate-950 rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                  aria-label="Agrandir la photo du magasin"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Agrandir
                </button>
              </div>
              <figcaption className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <Camera className="w-4 h-4 text-[#D9531E] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">
                    Façade principale GIS :
                  </strong>{' '}
                  entrepôt Quincaillerie & Ciment à gauche, dépôt de Boissons et chargement tricycle à droite.
                </span>
              </figcaption>
            </figure>

            {/* Panoramic Location Video */}
            <figure className="space-y-2.5">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 aspect-video">
                <video
                  controls
                  preload="metadata"
                  poster="/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.32.01_510dda49.jpeg"
                  className="w-full h-full object-cover"
                  aria-label="Vidéo panoramique de localisation géographique et accès au magasin Galilée Ivoire Service"
                >
                  <source
                    src="/assets/aistudio/WhatsApp_Video_2026-11-20_at_10.32.01_c5903e83.mp4"
                    type="video/mp4"
                  />
                  Votre navigateur ne prend pas en charge la lecture vidéo.
                </video>
              </div>
              <figcaption className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <Video className="w-4 h-4 text-[#0369A1] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900 dark:text-white">
                    Vidéo panoramique d’accès :
                  </strong>{' '}
                  repérez facilement la voie d’accès, l’espace fers à béton et le pylône télécom situé à proximité immédiate.
                </span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Access Guide, Hours & Phones */}
          <div className="lg:col-span-6 bg-[#0F2342] text-white rounded-xl p-7 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FDE047]">
                Localisation & Horaires
              </p>
              <h2 className="font-display font-bold text-2xl mt-1">
                Nous trouver facilement
              </h2>
            </div>

            <div className="flex items-start gap-3 text-sm text-slate-200 leading-relaxed">
              <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-1" />
              <p>{poster.location}</p>
            </div>

            {/* Landmark step-by-step */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/8 border border-white/12 rounded-lg p-3">
                <span className="text-[11px] font-mono-tabular text-[#FDE047]">
                  Repère 01
                </span>
                <p className="text-xs font-semibold mt-1">Près de la gare TSR</p>
              </div>
              <div className="bg-white/8 border border-white/12 rounded-lg p-3">
                <span className="text-[11px] font-mono-tabular text-[#FDE047]">
                  Repère 02
                </span>
                <p className="text-xs font-semibold mt-1">
                  Alignement agence Orange
                </p>
              </div>
              <div className="bg-white/8 border border-white/12 rounded-lg p-3">
                <span className="text-[11px] font-mono-tabular text-[#FDE047]">
                  Repère 03
                </span>
                <p className="text-xs font-semibold mt-1">
                  Bout des bâtiments (vers sous-préfecture)
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="border-t border-white/15 pt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-[#FDE047] font-semibold">
                <Clock className="w-4 h-4" />
                <span>Horaires d’ouverture</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span>Lundi – Vendredi</span>
                <span className="font-mono-tabular">{settings.hoursWeekdays}</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span>Samedi</span>
                <span className="font-mono-tabular">{settings.hoursSaturday}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Dimanche</span>
                <span className="font-mono-tabular">{settings.hoursSunday}</span>
              </div>
            </div>

            {/* Phones */}
            <div className="space-y-2.5 pt-2">
              {poster.phones.map((num, idx) => (
                <div
                  key={idx}
                  className="bg-white/8 border border-white/15 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <a
                    href={`tel:${num}`}
                    className="flex items-center gap-3 font-mono-tabular font-bold text-base text-white hover:text-[#FDE047] transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#F59E0B]" />
                    <span>{num}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(num)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                  >
                    {copiedPhone === num ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Validated Contact / Callback Request Form */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 space-y-5">
            <div>
              <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">
                Demander un renseignement ou un rappel
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Vérifiez la disponibilité d’un stock ou demandez un devis chantier / événementiel.
              </p>
            </div>

            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07 06 04 49 79"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pôle concerné
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'ciment', label: 'Ciment' },
                      { id: 'quincaillerie', label: 'Quincaillerie' },
                      { id: 'boissons', label: 'Boissons' },
                      { id: 'tous', label: 'Tous pôles' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPole(opt.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        pole === opt.id
                          ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Votre message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex. Disponibilité de 40 sacs de ciment et 10 packs d'eau minérale pour demain matin..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              {formSent && (
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Message enregistré avec succès. Notre équipe vous recontactera rapidement.
                </p>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer la demande
              </button>
            </form>

            {inquiries.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Dernières demandes enregistrées ({inquiries.length})
                </p>
                <ul className="space-y-2 max-h-32 overflow-y-auto">
                  {inquiries.slice(0, 3).map((inq) => (
                    <li
                      key={inq.id}
                      className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3"
                    >
                      <span className="truncate">
                        <strong className="text-slate-900 dark:text-white">
                          {inq.name}
                        </strong>{' '}
                        — {inq.message}
                      </span>
                      <span className="font-mono-tabular shrink-0 text-slate-400">
                        {inq.phone}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {isStorefrontLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo agrandie de la façade du magasin"
          onClick={() => setIsStorefrontLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white">
              <p className="text-xs font-semibold">
                {poster.companyName} — Façade principale (Quincaillerie, Ciment & Dépôt Boissons)
              </p>
              <button
                type="button"
                onClick={() => setIsStorefrontLightboxOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Fermer l’aperçu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.32.01_510dda49.jpeg"
              alt="Façade réelle du magasin Galilée Ivoire Service"
              className="w-full max-h-[80vh] object-contain bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
