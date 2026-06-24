const CITY_HOSTS = [
  {
    key: 'qeelwah',
    cityName: 'قلوة الصحية',
    region: 'محافظة قلوة',
    logoText: 'ق',
    hostnames: ['qilwah.qeelwah.com', 'www.qilwah.qeelwah.com', 'qeelwah.com', 'www.qeelwah.com'],
    fallback: true,
  },
  {
    key: 'al-mandaq',
    cityName: 'المندق الصحية',
    region: 'محافظة المندق',
    logoText: 'م',
    hostnames: ['mandaq.qeelwah.com', 'www.mandaq.qeelwah.com', 'almandaq.qeelwah.com'],
    fallback: false,
  },
];

function normalizeHost(value) {
  return String(value || '').trim().toLowerCase();
}

export function getCurrentHostname() {
  if (typeof window === 'undefined') return '';
  return normalizeHost(window.location.hostname);
}

export function getHostCityTemplate(hostname = getCurrentHostname()) {
  const normalizedHost = normalizeHost(hostname);
  return CITY_HOSTS.find((item) => item.hostnames.some((host) => normalizeHost(host) === normalizedHost)) || null;
}

export function getAllHostCityTemplates() {
  return CITY_HOSTS.filter((item) => item.fallback !== true);
}
