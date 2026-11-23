export type PosterModelId = 'editorial' | 'industrial' | 'dynamic';

export type PosterFormat = 'landscape' | 'square' | 'portrait';

export interface PosterSection {
  title: string;
  subtitle: string;
  items: string[];
}

export interface PosterContent {
  brandAcronym: string;
  companyName: string;
  tagline: string;
  hardware: PosterSection;
  beverages: PosterSection;
  phones: [string, string];
  location: string;
  commitments: [string, string, string, string];
  closingSlogan: string;
}

export const DEFAULT_POSTER_CONTENT: PosterContent = {
  brandAcronym: 'GIS',
  companyName: 'Galilée Ivoire Service',
  tagline: 'Votre partenaire de confiance !',
  hardware: {
    title: 'QUINCAILLERIE',
    subtitle: 'Tout pour vos travaux et vos projets !',
    items: [
      'Matériaux de construction',
      'Outils et équipements',
      'Peinture et accessoires',
      'Électricité et plomberie',
      'Articles divers',
    ],
  },
  beverages: {
    title: 'VENTE DE BOISSONS',
    subtitle: 'Rafraîchissement garanti !',
    items: [
      'Eaux minérales',
      'Boissons gazeuses',
      'Jus naturels',
      'Bières',
      'Autres boissons',
    ],
  },
  phones: ['0706044979', '0706014171'],
  location:
    'Situé près de la gare TSR, sur le même alignement que l’agence Orange, au bout des bâtiments en allant vers la sous-préfecture.',
  commitments: [
    'Qualité garantie',
    'Prix compétitifs',
    'Conseils personnalisés',
    'Service rapide',
  ],
  closingSlogan: 'Avec GIS, construisez, rafraîchissez-vous en toute sérénité !',
};

export interface PosterModelMeta {
  id: PosterModelId;
  label: string;
  shortDesc: string;
}

export const POSTER_MODELS: PosterModelMeta[] = [
  {
    id: 'editorial',
    label: '01. Éditorial Architecte',
    shortDesc: 'Grille suisse claire, papier ivoire et bleu marine technique',
  },
  {
    id: 'industrial',
    label: '02. Prestige Industriel',
    shortDesc: 'Fond anthracite profond, accents ambre et bleu glacier',
  },
  {
    id: 'dynamic',
    label: '03. Split Bicolore',
    shortDesc: 'Blocs géométriques vifs rouge chantier et bleu rafraîchissant',
  },
];
