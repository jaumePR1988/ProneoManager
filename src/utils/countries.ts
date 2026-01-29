
// Map of Spanish country names to ISO 3166-1 alpha-2 codes (lowercase)
// Used for displaying flags via flagcdn.com
export const getCountryCode = (countryName: string | undefined): string => {
    if (!countryName) return 'es'; // Default

    const normalized = countryName.toLowerCase().trim();

    const countryMap: Record<string, string> = {
        // EUROPA
        'españa': 'es', 'spain': 'es',
        'francia': 'fr', 'france': 'fr',
        'alemania': 'de', 'germany': 'de',
        'italia': 'it', 'italy': 'it',
        'portugal': 'pt',
        'inglaterra': 'gb-eng', 'england': 'gb-eng',
        'reino unido': 'gb', 'uk': 'gb',
        'escocia': 'gb-sct', 'scotland': 'gb-sct',
        'gales': 'gb-wls', 'wales': 'gb-wls',
        'irlanda del norte': 'gb-nir',
        'irlanda': 'ie', 'ireland': 'ie',
        'paises bajos': 'nl', 'países bajos': 'nl', 'holanda': 'nl', 'netherlands': 'nl',
        'belgica': 'be', 'bélgica': 'be', 'belgium': 'be',
        'suiza': 'ch', 'switzerland': 'ch',
        'austria': 'at',
        'croacia': 'hr', 'croatia': 'hr',
        'suecia': 'se', 'sweden': 'se',
        'dinamarca': 'dk', 'denmark': 'dk',
        'noruega': 'no', 'norway': 'no',
        'finlandia': 'fi', 'finland': 'fi',
        'islandia': 'is',
        'polonia': 'pl', 'poland': 'pl',
        'ucrania': 'ua', 'ukraine': 'ua',
        'rusia': 'ru', 'russia': 'ru',
        'turquia': 'tr', 'turquía': 'tr', 'turkey': 'tr',
        'grecia': 'gr', 'greece': 'gr',
        'serbia': 'rs',
        'republica checa': 'cz', 'república checa': 'cz', 'czech republic': 'cz',
        'eslovaquia': 'sk',
        'hungria': 'hu', 'hungría': 'hu',
        'rumania': 'ro',
        'bulgaria': 'bg',
        'eslovenia': 'si',
        'bosnia': 'ba', 'bosnia y herzegovina': 'ba',
        'montenegro': 'me',
        'macedonia': 'mk', 'macedonia del norte': 'mk',
        'albania': 'al',
        'kosovo': 'xk', // flagcdn code for Kosovo
        'andorra': 'ad',
        'gibraltar': 'gi',
        'luxemburgo': 'lu',
        'monaco': 'mc', 'mónaco': 'mc',
        'liechtenstein': 'li',
        'malta': 'mt',
        'chipre': 'cy',
        'estonia': 'ee',
        'letonia': 'lv',
        'lituania': 'lt',
        'bielorrusia': 'by',
        'moldavia': 'md',
        'georgia': 'ge',
        'armenia': 'am',
        'azerbaiyan': 'az', 'azerbaiyán': 'az',
        'israel': 'il',

        // SURAMÉRICA
        'argentina': 'ar',
        'brasil': 'br', 'brazil': 'br',
        'uruguay': 'uy',
        'chile': 'cl',
        'colombia': 'co',
        'peru': 'pe', 'perú': 'pe',
        'venezuela': 've',
        'ecuador': 'ec',
        'paraguay': 'py',
        'bolivia': 'bo',

        // NORTEAMÉRICA Y CENTROAMÉRICA
        'estados unidos': 'us', 'usa': 'us', 'eeuu': 'us',
        'mexico': 'mx', 'méxico': 'mx',
        'canada': 'ca', 'canadá': 'ca',
        'costa rica': 'cr',
        'panama': 'pa', 'panamá': 'pa',
        'honduras': 'hn',
        'el salvador': 'sv',
        'guatemala': 'gt',
        'nicaragua': 'ni',
        'jamaica': 'jm',
        'haiti': 'ht', 'haití': 'ht',
        'republica dominicana': 'do', 'república dominicana': 'do',
        'trinidad y tobago': 'tt',
        'cuba': 'cu',

        // ÁFRICA
        'marruecos': 'ma', 'morocco': 'ma',
        'senegal': 'sn',
        'nigeria': 'ng',
        'camerun': 'cm', 'camerún': 'cm', 'cameroon': 'cm',
        'ghana': 'gh',
        'costa de marfil': 'ci', 'cote d\'ivoire': 'ci',
        'egipto': 'eg', 'egypt': 'eg',
        'argelia': 'dz', 'algeria': 'dz',
        'tunez': 'tn', 'túnez': 'tn', 'tunisia': 'tn',
        'mali': 'ml',
        'burkina faso': 'bf',
        'guinea': 'gn',
        'guinea ecuatorial': 'gq',
        'gambia': 'gm',
        'cabo verde': 'cv',
        'sudafrica': 'za', 'sudáfrica': 'za', 'south africa': 'za',
        'congo': 'cg',
        'rd congo': 'cd', 'congo dr': 'cd',
        'gabon': 'ga', 'gabón': 'ga',
        'angola': 'ao',
        'togo': 'tg',
        'benin': 'bj',

        // ASIA
        'japon': 'jp', 'japón': 'jp', 'japan': 'jp',
        'corea del sur': 'kr', 'south korea': 'kr', 'corea': 'kr',
        'china': 'cn',
        'arabia saudi': 'sa', 'arabia saudí': 'sa', 'saudi arabia': 'sa',
        'catar': 'qa', 'qatar': 'qa',
        'iran': 'ir', 'irán': 'ir',
        'e irak': 'iq', 'irak': 'iq', 'iraq': 'iq',
        'emiratos arabes': 'ae', 'emiratos árabes unidos': 'ae', 'uae': 'ae',
        'uzbekistan': 'uz', 'uzbekistán': 'uz',
        'taryikistan': 'tj',
        'india': 'in',
        'tailandia': 'th',
        'vietnam': 'vn',
        'indonesia': 'id',
        'filipinas': 'ph',

        // OCEANÍA
        'australia': 'au',
        'nueva zelanda': 'nz', 'new zealand': 'nz'
    };

    return countryMap[normalized] || 'es'; // Default fallback
};

export const getCountryFlagUrl = (countryName: string | undefined): string => {
    const code = getCountryCode(countryName);
    return `https://flagcdn.com/w40/${code}.png`;
};
