export interface DiagnosticLab {
  id: string;
  name: string;
  slug: string;
  website: string;
  category: 'Diagnostic Lab' | 'Pharmacy & Diagnostics' | 'Scan & Diagnostic Center';
  tagline: string;
}

export const DIAGNOSTIC_LABS: DiagnosticLab[] = [
  {
    id: 'dr-lal-pathlabs',
    name: 'Dr Lal PathLabs',
    slug: 'dr-lal-pathlabs',
    website: 'https://www.lalpathlabs.com',
    category: 'Diagnostic Lab',
    tagline: 'Leading national pathology lab network with NABL accredited centers.',
  },
  {
    id: 'tata-1mg',
    name: 'Tata 1mg',
    slug: 'tata-1mg',
    website: 'https://www.1mg.com',
    category: 'Pharmacy & Diagnostics',
    tagline: 'Comprehensive digital healthcare, lab testing and medicine delivery.',
  },
  {
    id: 'redcliffe-labs',
    name: 'Redcliffe Labs',
    slug: 'redcliffe-labs',
    website: 'https://redcliffelabs.com',
    category: 'Diagnostic Lab',
    tagline: 'Affordable routine & specialized diagnostic pathology services.',
  },
  {
    id: 'healthians',
    name: 'Healthians',
    slug: 'healthians',
    website: 'https://www.healthians.com',
    category: 'Diagnostic Lab',
    tagline: 'Direct-to-consumer doorstep health test & pathology provider.',
  },
  {
    id: 'thyrocare',
    name: 'Thyrocare',
    slug: 'thyrocare',
    website: 'https://www.thyrocare.com',
    category: 'Diagnostic Lab',
    tagline: 'Pioneer in thyroid testing and comprehensive preventive health checkups.',
  },
  {
    id: 'metropolis-healthcare',
    name: 'Metropolis Healthcare',
    slug: 'metropolis-healthcare',
    website: 'https://www.metropolisindia.com',
    category: 'Diagnostic Lab',
    tagline: 'Multinational pathology chain specialized in oncology and genetics.',
  },
  {
    id: 'orange-health-labs',
    name: 'Orange Health Labs',
    slug: 'orange-health-labs',
    website: 'https://www.orangehealth.in',
    category: 'Diagnostic Lab',
    tagline: 'Speedy 60-minute at-home blood collection with fast digital reports.',
  },
  {
    id: 'agilus-diagnostics',
    name: 'Agilus Diagnostics',
    slug: 'agilus-diagnostics',
    website: 'https://agilusdiagnostics.com',
    category: 'Diagnostic Lab',
    tagline: 'Formerly SRL Diagnostics, premier clinical laboratory network.',
  },
  {
    id: 'vijaya-diagnostic-centre',
    name: 'Vijaya Diagnostic Centre',
    slug: 'vijaya-diagnostic-centre',
    website: 'https://www.vijayadiagnostic.com',
    category: 'Scan & Diagnostic Center',
    tagline: 'Integrated diagnostic chain offering pathology, radiology and imaging.',
  },
  {
    id: 'neuberg-diagnostics',
    name: 'Neuberg Diagnostics',
    slug: 'neuberg-diagnostics',
    website: 'https://neubergdiagnostics.com',
    category: 'Diagnostic Lab',
    tagline: 'Global alliance of advanced pathology labs specializing in genomics.',
  },
  {
    id: 'aarthi-scans-and-labs',
    name: 'Aarthi Scans and Labs',
    slug: 'aarthi-scans-and-labs',
    website: 'https://aarthiscan.com',
    category: 'Scan & Diagnostic Center',
    tagline: 'Affordable high-end MRI, CT, and complete pathology diagnostic chain.',
  },
  {
    id: 'dr-dangs-lab',
    name: 'Dr. Dangs Lab',
    slug: 'dr-dangs-lab',
    website: 'https://www.drdangslab.com',
    category: 'Diagnostic Lab',
    tagline: 'Gold-standard quality clinical laboratory based in New Delhi.',
  },
  {
    id: 'jcrl-diagnostics',
    name: 'JCRL Diagnostics',
    slug: 'jcrl-diagnostics',
    website: 'https://www.jcrldiagnostics.com',
    category: 'Diagnostic Lab',
    tagline: 'Regional specialized clinical reference laboratory network.',
  },
  {
    id: 'nhcare-pathlabs',
    name: 'NHCare Pathlabs',
    slug: 'nhcare-pathlabs',
    website: 'https://www.nhcarepathlabs.com',
    category: 'Diagnostic Lab',
    tagline: 'Patient-centric pathology services with quality-controlled testing.',
  },
  {
    id: 'quiklabz',
    name: 'QuikLabz',
    slug: 'quiklabz',
    website: 'https://www.quiklabz.com',
    category: 'Diagnostic Lab',
    tagline: 'Express home-sample collection and rapid diagnostic turnaround.',
  },
];
