export interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  icon: string;
  color?: string;
  image?: string;
  price_type?: 'duration' | 'treatment';
  duration_options?: Array<{ duration: number; price: number }>;
  category_slug?: string[];
  image_url?: string;
}

export const SERVICES: Service[] = [
  {
    id: 'pijat-full-body',
    name: 'Pijat Full Body',
    price: 170000,
    duration: '90 Menit',
    description: 'Pijatan menyeluruh dari kepala hingga ujung kaki untuk meredakan otot kaku.',
    icon: '💆‍♂️',
    color: '#6A0DAD',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80',
  },
  {
    id: 'bekam',
    name: 'Bekam',
    price: 170000,
    duration: '1x Treatment',
    description: 'Terapi pengeluaran racun dan darah kotor untuk meningkatkan sistem imun.',
    icon: '🏮',
    color: '#E74C3C',
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80',
  },
  {
    id: 'pijat-ibu-hamil',
    name: 'Pijat Ibu Hamil',
    price: 150000,
    duration: '75 Menit',
    description: 'Teknik pijat khusus yang aman untuk ibu hamil guna mengurangi pegal.',
    icon: '🤰',
    color: '#FF69B4',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
  },
  {
    id: 'pijat-fullbody-bekam',
    name: 'Pijat FullBody + Bekam',
    price: 280000,
    duration: '120 Menit',
    description: 'Kombinasi lengkap relaksasi otot dan terapi detoksifikasi darah.',
    icon: '💆‍♂️🏮',
    color: '#8E44AD',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  },
  {
    id: 'fullbody-totok-wajah',
    name: 'FullBody + Totok Wajah',
    price: 250000,
    duration: '120 Menit',
    description: 'Pijatan seluruh tubuh dipadukan dengan totok wajah untuk kesegaran paras.',
    icon: '💆‍♂️✨',
    color: '#F1C40F',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80',
  },
  {
    id: 'pijat-anak',
    name: 'Pijat Anak Max 12th',
    price: 90000,
    duration: '60 Menit',
    description: 'Pijatan lembut untuk buah hati guna meningkatkan kualitas tidur.',
    icon: '👶',
    color: '#3498DB',
    image: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&q=80',
  },
  {
    id: 'shiatsu-japan',
    name: 'Shiatsu Japan',
    price: 190000,
    duration: '90 Menit',
    description: 'Teknik penekanan titik saraf tanpa minyak ala Jepang.',
    icon: '⛩️',
    color: '#C0392B',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecee?w=400&q=80',
  },
  {
    id: 'lulur-scrub',
    name: 'Lulur Scrub',
    price: 180000,
    duration: '90 Menit',
    description: 'Pembersihan kulit mati dengan scrub premium untuk kulit halus.',
    icon: '🧴',
    color: '#1ABC9C',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
  },
  {
    id: 'ear-candle',
    name: 'Ear Candle',
    price: 80000,
    duration: '45 Menit',
    description: 'Terapi telinga untuk membersihkan kotoran dan relaksasi.',
    icon: '🕯️',
    color: '#F39C12',
    image: 'https://images.unsplash.com/photo-1563814039166-50bc2989d552?w=400&q=80',
  },
  {
    id: 'kerikan-kop',
    name: 'Kerikan / Kop',
    price: 100000,
    duration: '60 Menit',
    description: 'Solusi tradisional efektif untuk meredakan gejala masuk angin.',
    icon: '🪙',
    color: '#D35400',
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400&q=80',
  },
  {
    id: 'deep-tissue',
    name: 'Deep Tissue',
    price: 220000,
    duration: '90 Menit',
    description: 'Pijatan dengan tekanan kuat untuk mengatasi kaku kronis.',
    icon: '🦾',
    color: '#2C3E50',
    image: 'https://images.unsplash.com/photo-1519823251149-9955c739540e?w=400&q=80',
  },
  {
    id: 'facial',
    name: 'Facial',
    price: 90000,
    duration: '60 Menit',
    description: 'Perawatan wajah untuk mengangkat kotoran pori-pori.',
    icon: '✨',
    color: '#ECf0F1',
    image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80',
  },
  {
    id: 'pijat-body-refleksi',
    name: 'Pijat Body + Refleksi',
    price: 250000,
    duration: '120 Menit',
    description: 'Paduan pijat tubuh dan refleksi kaki yang fokus pada titik saraf.',
    icon: '💆‍♂️🦶',
    color: '#27AE60',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  },
  {
    id: 'premium-all-in',
    name: 'Premium All-In',
    price: 750000,
    duration: '240 Menit',
    description: 'Paket mewah: Body Massage, Totok, Lulur, dan Ear Candle.',
    icon: '👑',
    color: '#FDB927',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80',
  },
];
