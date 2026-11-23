import React, { useState } from 'react';
import { Plus, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import {
  ALL_STAFF_ROLES,
  Member,
  StaffRole,
  UserRole,
  WORKER_ROLES,
} from '../types/app';
import { getRoleLabel } from '../utils/formatters';

interface MembersPageProps {
  members: Member[];
  currentUid: string;
  currentRole: UserRole;
  onSaveMember: (member: Member, isNew: boolean) => void;
  onDeleteMember: (member: Member) => void;
}

const ROLE_RESPONSIBILITIES: { role: StaffRole; summary: string }[] = [
  {
    role: 'caisse',
    summary:
      'Création, modification et encaissement des Factures & Devis ; suivi de caisse.',
  },
  {
    role: 'chargeur',
    summary:
      'Préparation des sacs de ciment, matériaux et boissons ; suivi des chargements.',
  },
  {
    role: 'chauffeur',
    summary:
      'Prise en charge des livraisons locales et validation de remise au client.',
  },
  {
    role: 'gerant_boisson',
    summary:
      'Gestionnaire de stock boissons : tarifs, approvisionnement et inventaire Boissons.',
  },
  {
    role: 'gerant_ciment',
    summary:
      'Gestionnaire de stock ciment : tarifs, approvisionnement et inventaire Ciment & Quincaillerie.',
  },
];

export const MembersPage: React.FC<MembersPageProps> = ({
  members,
  currentUid,
  currentRole,
  onSaveMember,
  onDeleteMember,
}) => {
  const isSuperAdmin = currentRole === 'super_admin';
  const isPatron = currentRole === 'admin_patron' || isSuperAdmin;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('caisse');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  const assignableRoles: StaffRole[] = isSuperAdmin
    ? ALL_STAFF_ROLES
    : WORKER_ROLES;

  const canModifyMember = (m: Member) => {
    if (isSuperAdmin) return true;
    if (isPatron) {
      return m.role !== 'super_admin' && m.role !== 'admin_patron';
    }
    return false;
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isPatron) {
      setError('Seul le Patron ou le Super Admin peut ajouter des membres.');
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Veuillez saisir le nom complet de l’employé.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setError('Veuillez saisir une adresse e-mail Google valide.');
      return;
    }
    const alreadyExists = members.some(
      (m) => m.email.toLowerCase() === cleanEmail
    );
    if (alreadyExists) {
      setError('Un membre ou Admin existe déjà avec cette adresse e-mail.');
      return;
    }

    const viewerUids = Array.from(
      new Set([
        currentUid,
        ...members.map((m) => m.uid).filter((x): x is string => Boolean(x)),
      ])
    ).slice(0, 30);

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      role,
      active: true,
      assignedByUid: currentUid,
      staffViewerUids: viewerUids,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveMember(newMember, true);
    setFullName('');
    setEmail('');
    setPhone('');
  };

  const getSupervisorLabel = (m: Member): string | null => {
    if (m.role === 'super_admin') return null;
    if (m.role === 'admin_patron') return 'Créé par Super Admin';
    if (!m.assignedByUid) return null;
    const supervisor = members.find((item) => item.uid === m.assignedByUid);
    if (supervisor) {
      return `Géré par : ${supervisor.fullName}`;
    }
    return 'Géré par Super Admin / Patron';
  };

  const filteredMembers =
    roleFilter === 'all'
      ? members
      : members.filter((m) => m.role === roleFilter);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Super Admin → Admins (Patrons) → Employés · Attribution des rôles
          </p>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Gestion des Membres & Employés
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isSuperAdmin
            ? 'Accès Super Admin : gestion complète Admins & Employés'
            : isPatron
              ? 'Accès Admin (Patron) : recrutement des employés et attribution des rôles'
              : 'Consultation de l’annuaire de l’équipe'}
        </p>
      </div>

      {/* Add Worker Form (Patron & Super Admin only) */}
      {isPatron && (
        <form
          onSubmit={handleAddMember}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display font-bold text-lg">
            Recruter / Enregistrer un membre et attribuer son rôle
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex. Koné Ibrahim"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail Google de connexion *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employe@gmail.com"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07 06 04 49 79"
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rôle attribué *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ajouter et attribuer le rôle
            </button>
          </div>
        </form>
      )}

      {/* Role Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md border cursor-pointer ${
            roleFilter === 'all'
              ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          Tous ({members.length})
        </button>
        {ALL_STAFF_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
              roleFilter === r
                ? 'bg-[#0F2342] text-white border-[#0F2342] dark:bg-[#D9531E] dark:border-[#D9531E]'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {getRoleLabel(r)}
          </button>
        ))}
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="font-display font-semibold text-base">
              Aucun membre enregistré dans cette catégorie
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">Employé</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Rôle attribué</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  {isPatron && (
                    <th className="py-3 px-4 font-semibold text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMembers.map((member) => {
                  const editable = canModifyMember(member);
                  const supervisorLabel = getSupervisorLabel(member);
                  return (
                    <tr key={member.id}>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {member.email}
                        </p>
                        {supervisorLabel && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {supervisorLabel}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-300">
                        {member.phone || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {editable ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              onSaveMember(
                                {
                                  ...member,
                                  role: e.target.value as StaffRole,
                                  updatedAt: new Date().toISOString(),
                                },
                                false
                              )
                            }
                            aria-label={`Changer le rôle de ${member.fullName}`}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                          >
                            {assignableRoles.map((r) => (
                              <option key={r} value={r}>
                                {getRoleLabel(r)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {getRoleLabel(member.role)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-xs font-semibold ${
                            member.active
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {member.active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      {isPatron && (
                        <td className="py-3 px-4 text-right">
                          {editable ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveMember(
                                    {
                                      ...member,
                                      active: !member.active,
                                      updatedAt: new Date().toISOString(),
                                    },
                                    false
                                  )
                                }
                                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                title={
                                  member.active ? 'Suspendre' : 'Réactiver'
                                }
                              >
                                {member.active ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteMember(member)}
                                className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Supprimer le membre"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Géré par Super Admin
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-display font-bold text-lg">
          Attributions des postes ouvriers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROLE_RESPONSIBILITIES.map((item) => (
            <div key={item.role} className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {getRoleLabel(item.role)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
