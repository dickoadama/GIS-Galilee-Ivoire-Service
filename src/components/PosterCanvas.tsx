import React from 'react';
import { Check, MapPin, Phone, ShieldCheck, Tag, MessageSquare, Zap } from 'lucide-react';
import { PosterContent, PosterFormat, PosterModelId } from '../types/poster';
import {
  BeverageIllustration,
  GisArchitecturalLogo,
  HardwareIllustration,
} from './BrandIllustrations';

interface PosterCanvasProps {
  content: PosterContent;
  model: PosterModelId;
  format: PosterFormat;
}

const COMMITMENT_ICONS = [ShieldCheck, Tag, MessageSquare, Zap];

export const PosterCanvas: React.FC<PosterCanvasProps> = ({
  content,
  model,
  format,
}) => {
  const isPortrait = format === 'portrait';
  const isSquare = format === 'square';

  const containerDimensions =
    format === 'landscape'
      ? 'w-full max-w-[1100px] aspect-[16/10]'
      : format === 'square'
        ? 'w-full max-w-[820px] aspect-square'
        : 'w-full max-w-[680px] aspect-[3/4]';

  if (model === 'editorial') {
    return (
      <article
        className={`print-only-poster mx-auto bg-[#F8F7F4] text-[#0F2342] border border-[#CBD5E1] shadow-sm overflow-hidden flex flex-col justify-between ${containerDimensions}`}
      >
        {/* Top Editorial Masthead */}
        <header className="px-6 sm:px-9 pt-6 sm:pt-7 pb-5 border-b border-[#CBD5E1] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GisArchitecturalLogo
              acronym={content.brandAcronym}
              primaryColor="#0F2342"
              accentColor="#D9531E"
              className="h-12 sm:h-14 w-auto shrink-0"
            />
            <div className="border-l border-[#CBD5E1] pl-4">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-[#0F2342] leading-tight">
                {content.companyName}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#D9531E] mt-0.5">
                {content.tagline}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
              Commandes & Renseignements
            </p>
            <p className="font-mono-tabular font-bold text-lg sm:text-xl text-[#0F2342] tracking-tight mt-0.5">
              {content.phones[0]} <span className="text-[#CBD5E1]">/</span> {content.phones[1]}
            </p>
          </div>
        </header>

        {/* Dual Activity Columns */}
        <div
          className={`flex-1 grid ${
            isPortrait ? 'grid-cols-1 divide-y' : 'grid-cols-1 md:grid-cols-2 md:divide-x'
          } divide-[#CBD5E1] min-h-0`}
        >
          {/* Quincaillerie Column */}
          <section className="p-6 sm:p-8 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-baseline justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div>
                  <span className="text-xs font-semibold text-[#D9531E] tracking-wide">
                    01 · Pôle Bâtiment
                  </span>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#0F2342] mt-0.5">
                    {content.hardware.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#334155] mt-2.5">
                {content.hardware.subtitle}
              </p>

              <ul className="mt-4 space-y-2.5">
                {content.hardware.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm sm:text-[15px] font-medium text-[#0F2342]"
                  >
                    <span className="font-mono-tabular text-xs font-bold text-[#D9531E] w-5 shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!isSquare && (
              <div className="h-28 sm:h-32 w-full mt-auto">
                <HardwareIllustration
                  primaryColor="#0F2342"
                  secondaryColor="#D9531E"
                  surfaceColor="#EFECE6"
                />
              </div>
            )}
          </section>

          {/* Vente de Boissons Column */}
          <section className="p-6 sm:p-8 flex flex-col justify-between gap-4 bg-[#F1F5F9]/60">
            <div>
              <div className="flex items-baseline justify-between gap-3 border-b border-[#CBD5E1] pb-3">
                <div>
                  <span className="text-xs font-semibold text-[#0369A1] tracking-wide">
                    02 · Pôle Distribution
                  </span>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#0F2342] mt-0.5">
                    {content.beverages.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm font-semibold text-[#0369A1] mt-2.5">
                {content.beverages.subtitle}
              </p>

              <ul className="mt-4 space-y-2.5">
                {content.beverages.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm sm:text-[15px] font-medium text-[#0F2342]"
                  >
                    <span className="font-mono-tabular text-xs font-bold text-[#0369A1] w-5 shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!isSquare && (
              <div className="h-28 sm:h-32 w-full mt-auto">
                <BeverageIllustration
                  primaryColor="#0F2342"
                  secondaryColor="#0284C7"
                  surfaceColor="#E2ECF5"
                />
              </div>
            )}
          </section>
        </div>

        {/* Commitments & Location Band */}
        <footer className="border-t border-[#CBD5E1] bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-[#E2E8F0] px-4 sm:px-8 py-3">
            {content.commitments.map((commitment, idx) => {
              const Icon = COMMITMENT_ICONS[idx % COMMITMENT_ICONS.length];
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0F2342]"
                >
                  <Icon className="w-4 h-4 text-[#D9531E] shrink-0" />
                  <span>{commitment}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-[#0F2342] text-white px-6 sm:px-9 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-[13px] text-slate-200 max-w-2xl leading-snug">
              <MapPin className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5 sm:mt-0" />
              <span>{content.location}</span>
            </div>
            <p className="font-display font-bold text-sm sm:text-base text-[#FDE047] shrink-0">
              {content.closingSlogan}
            </p>
          </div>
        </footer>
      </article>
    );
  }

  if (model === 'industrial') {
    return (
      <article
        className={`print-only-poster mx-auto bg-[#0B1220] text-[#F8FAFC] border border-[#1E293B] shadow-lg overflow-hidden flex flex-col justify-between ${containerDimensions}`}
      >
        {/* Top Industrial Dark Header */}
        <header className="px-6 sm:px-9 pt-6 pb-5 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-4 bg-[#0F172A]">
          <div className="flex items-center gap-4">
            <GisArchitecturalLogo
              acronym={content.brandAcronym}
              primaryColor="#F8FAFC"
              accentColor="#F59E0B"
              className="h-12 sm:h-14 w-auto shrink-0"
            />
            <div className="pl-4 border-l border-[#334155]">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                {content.companyName}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#F59E0B] mt-0.5">
                {content.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#162032] border border-[#334155] rounded-lg px-4 py-2.5">
            <Phone className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="font-mono-tabular font-bold text-base sm:text-lg text-white">
              {content.phones[0]} · {content.phones[1]}
            </span>
          </div>
        </header>

        {/* Dual Brushed Steel Panels */}
        <div
          className={`flex-1 grid ${
            isPortrait ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          } gap-4 p-5 sm:p-7 min-h-0`}
        >
          {/* Quincaillerie Dark Amber Panel */}
          <section className="bg-[#131C2E] border border-[#26344D] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#26344D] pb-3">
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#F59E0B] tracking-tight">
                  {content.hardware.title}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-400">01</span>
              </div>
              <p className="text-sm font-medium text-slate-300 mt-2.5">
                {content.hardware.subtitle}
              </p>

              <ul className="mt-4 space-y-2.5">
                {content.hardware.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm sm:text-[15px] text-slate-100"
                  >
                    <Check className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!isSquare && (
              <div className="h-24 sm:h-28 w-full mt-auto">
                <HardwareIllustration
                  primaryColor="#E2E8F0"
                  secondaryColor="#F59E0B"
                  surfaceColor="rgba(255,255,255,0.04)"
                />
              </div>
            )}
          </section>

          {/* Boissons Dark Ice Panel */}
          <section className="bg-[#131C2E] border border-[#26344D] rounded-xl p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between border-b border-[#26344D] pb-3">
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#38BDF8] tracking-tight">
                  {content.beverages.title}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-400">02</span>
              </div>
              <p className="text-sm font-medium text-slate-300 mt-2.5">
                {content.beverages.subtitle}
              </p>

              <ul className="mt-4 space-y-2.5">
                {content.beverages.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 text-sm sm:text-[15px] text-slate-100"
                  >
                    <Check className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!isSquare && (
              <div className="h-24 sm:h-28 w-full mt-auto">
                <BeverageIllustration
                  primaryColor="#E2E8F0"
                  secondaryColor="#38BDF8"
                  surfaceColor="rgba(255,255,255,0.04)"
                />
              </div>
            )}
          </section>
        </div>

        {/* Bottom Dark Footer */}
        <footer className="border-t border-[#1E293B] bg-[#0F172A]">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#1E293B] px-4 sm:px-8 py-3">
            {content.commitments.map((commitment, idx) => {
              const Icon = COMMITMENT_ICONS[idx % COMMITMENT_ICONS.length];
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 px-3 py-1 text-xs sm:text-sm font-medium text-slate-200"
                >
                  <Icon className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <span>{commitment}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-[#F59E0B] text-[#0B1220] px-6 sm:px-9 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2 text-xs sm:text-[13px] font-semibold max-w-2xl leading-snug">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
              <span>{content.location}</span>
            </div>
            <p className="font-display font-extrabold text-sm sm:text-base shrink-0">
              {content.closingSlogan}
            </p>
          </div>
        </footer>
      </article>
    );
  }

  // Model 3: Dynamic Split Bicolore (Modernized Brand Heritage Colors)
  return (
    <article
      className={`print-only-poster mx-auto bg-white text-[#0F172A] border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between ${containerDimensions}`}
    >
      {/* Clean High-Contrast White Header */}
      <header className="px-6 sm:px-9 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <GisArchitecturalLogo
            acronym={content.brandAcronym}
            primaryColor="#0B2559"
            accentColor="#EA580C"
            className="h-12 sm:h-14 w-auto shrink-0"
          />
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#0B2559] leading-tight">
              {content.companyName}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#EA580C]">
              {content.tagline}
            </p>
          </div>
        </div>

        <div className="bg-[#0B2559] text-white rounded-lg px-4 py-2.5 flex items-center gap-2.5">
          <Phone className="w-4 h-4 text-[#FACC15] shrink-0" />
          <span className="font-mono-tabular font-bold text-base sm:text-lg">
            {content.phones[0]} / {content.phones[1]}
          </span>
        </div>
      </header>

      {/* Bold Color-Blocked Split Grid */}
      <div
        className={`flex-1 grid ${
          isPortrait ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        } min-h-0`}
      >
        {/* Left: Warm Crimson/Gold Hardware Block */}
        <section className="bg-[#B91C1C] text-white p-6 sm:p-8 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-block border-b-2 border-[#FACC15] pb-2">
              <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
                {content.hardware.title}
              </h3>
            </div>
            <p className="text-sm font-semibold text-[#FEF08A] mt-2">
              {content.hardware.subtitle}
            </p>

            <ul className="mt-4 space-y-2.5">
              {content.hardware.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-sm sm:text-[15px] font-medium text-white"
                >
                  <span className="w-5 h-5 rounded-full bg-[#FACC15] text-[#7F1D1D] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {!isSquare && (
            <div className="h-24 sm:h-28 w-full mt-auto">
              <HardwareIllustration
                primaryColor="#FFFFFF"
                secondaryColor="#FACC15"
                surfaceColor="rgba(255,255,255,0.10)"
              />
            </div>
          )}
        </section>

        {/* Right: Deep Cobalt/Ice Beverages Block */}
        <section className="bg-[#0B2559] text-white p-6 sm:p-8 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-block border-b-2 border-[#38BDF8] pb-2">
              <h3 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#FACC15]">
                {content.beverages.title}
              </h3>
            </div>
            <p className="text-sm font-semibold text-[#BAE6FD] mt-2">
              {content.beverages.subtitle}
            </p>

            <ul className="mt-4 space-y-2.5">
              {content.beverages.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-sm sm:text-[15px] font-medium text-white"
                >
                  <span className="w-5 h-5 rounded-full bg-[#38BDF8] text-[#0B2559] flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {!isSquare && (
            <div className="h-24 sm:h-28 w-full mt-auto">
              <BeverageIllustration
                primaryColor="#FFFFFF"
                secondaryColor="#38BDF8"
                surfaceColor="rgba(255,255,255,0.10)"
              />
            </div>
          )}
        </section>
      </div>

      {/* Bottom Trust + Address + Slogan */}
      <footer>
        <div className="bg-[#FACC15] text-[#0B2559] grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#EAB308] px-4 sm:px-8 py-2.5">
          {content.commitments.map((commitment, idx) => {
            const Icon = COMMITMENT_ICONS[idx % COMMITMENT_ICONS.length];
            return (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 text-xs sm:text-sm font-bold"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{commitment}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-[#0F172A] text-white px-6 sm:px-9 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-[13px] text-slate-200 max-w-2xl leading-snug">
            <MapPin className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5 sm:mt-0" />
            <span>{content.location}</span>
          </div>
          <p className="font-display font-bold text-sm sm:text-base text-[#FACC15] shrink-0">
            {content.closingSlogan}
          </p>
        </div>
      </footer>
    </article>
  );
};
