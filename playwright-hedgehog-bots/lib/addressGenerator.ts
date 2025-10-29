import { faker } from '@faker-js/faker';

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

const EU_COUNTRIES = ['DE', 'FR', 'NL', 'BE', 'AT'];
const US_STATES = ['NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

export const generateEUAddress = (): Address => {
  const country = EU_COUNTRIES[Math.floor(Math.random() * EU_COUNTRIES.length)];
  
  const addressData: Record<string, any> = {
    DE: {
      postalCode: () => faker.string.numeric(5),
      city: () => faker.helpers.arrayElement(['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt']),
    },
    FR: {
      postalCode: () => faker.string.numeric(5),
      city: () => faker.helpers.arrayElement(['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']),
    },
    NL: {
      postalCode: () => `${faker.string.numeric(4)} ${faker.string.alpha(2).toUpperCase()}`,
      city: () => faker.helpers.arrayElement(['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen']),
    },
    BE: {
      postalCode: () => faker.string.numeric(4),
      city: () => faker.helpers.arrayElement(['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège']),
    },
    AT: {
      postalCode: () => faker.string.numeric(4),
      city: () => faker.helpers.arrayElement(['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck']),
    },
  };
  
  const data = addressData[country];
  
  return {
    name: faker.person.fullName(),
    line1: faker.location.streetAddress(),
    city: data.city(),
    postalCode: data.postalCode(),
    country,
  };
};

export const generateUSAddress = (): Address => {
  const state = US_STATES[Math.floor(Math.random() * US_STATES.length)];
  
  return {
    name: faker.person.fullName(),
    line1: faker.location.streetAddress(),
    city: faker.location.city(),
    state,
    postalCode: faker.location.zipCode(),
    country: 'US',
  };
};

export const generateAddress = (region: 'EU' | 'US' = 'EU'): Address => {
  return region === 'EU' ? generateEUAddress() : generateUSAddress();
};
