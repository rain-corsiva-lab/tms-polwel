/**
 * Seed script: adds 20 demo venues for pagination testing.
 * Safe to run multiple times – uses upsert-by-name to avoid duplicates.
 *
 * Usage:
 *   cd polwel-backend
 *   npx ts-node -r tsconfig-paths/register scripts/seedDummyVenues.ts
 */

import { PrismaClient, VenueStatus } from '@prisma/client';

const prisma = new PrismaClient();

const dummyVenues = [
  {
    name: 'Suntec City Convention Hall A',
    address: '1 Raffles Boulevard, Suntec City, Singapore 039593',
    description: 'Large convention hall with full AV setup. Capacity: 200 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 1200.0,
    maxParticipants: 200,
    perHeadPriceIfMaxExceed: 8.0,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'catering'],
    contacts: [{ id: '1', name: 'David Lim', number: '+65 6337 2888', email: 'events.a@suntec.com.sg' }],
    remarks: 'Full catering options available.',
  },
  {
    name: 'Raffles Place Executive Suite',
    address: '8 Shenton Way, Singapore 068811',
    description: 'Executive boardroom-style training facility. Capacity: 30 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 500.0,
    maxParticipants: 30,
    perHeadPriceIfMaxExceed: 20.0,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Grace Ng', number: '+65 6220 4588', email: 'reservations@rafflesplace.com.sg' }],
    remarks: 'Morning refreshments included.',
  },
  {
    name: 'Tampines Hub Community Room',
    address: '1 Tampines Walk, Singapore 528523',
    description: 'Multi-purpose room ideal for workshops. Capacity: 40 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 250.0,
    maxParticipants: 40,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi'],
    contacts: [{ id: '1', name: 'Aisha Binte Rahman', number: '+65 6788 3000', email: 'booking@tamphub.com.sg' }],
    remarks: 'Parking available onsite.',
  },
  {
    name: 'Jurong East Training Suite 2',
    address: '21 Jurong East Street 13, Singapore 609675',
    description: 'Modern training room in Jurong East. Capacity: 50 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 350.0,
    maxParticipants: 50,
    perHeadPriceIfMaxExceed: 10.0,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'flip-charts', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Marcus Tan', number: '+65 6560 1234', email: 'training@jurongeast.com.sg' }],
    remarks: 'Nearby MRT access.',
  },
  {
    name: 'Bugis Junction Rooftop Space',
    address: '200 Victoria Street, Singapore 188021',
    description: 'Open-concept rooftop venue for creative training sessions. Capacity: 60 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 700.0,
    maxParticipants: 60,
    status: VenueStatus.ACTIVE,
    facilities: ['wifi', 'sound-system', 'projector'],
    contacts: [{ id: '1', name: 'Priya Sundaram', number: '+65 6239 8888', email: 'events@bugisjunction.com.sg' }],
    remarks: 'Outdoor setup; weather-dependent.',
  },
  {
    name: 'Novena Square Meeting Room 3',
    address: '238 Thomson Road, Singapore 307683',
    description: 'Mid-sized meeting room suitable for seminars. Capacity: 35 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 400.0,
    maxParticipants: 35,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Lena Chua', number: '+65 6250 0188', email: 'rooms@novenasq.com.sg' }],
    remarks: 'Lunch arrangements available upon request.',
  },
  {
    name: 'Paya Lebar Quarter Studio',
    address: '10 Paya Lebar Road, Singapore 409057',
    description: 'Creative studio space with flexible layout. Capacity: 45 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 450.0,
    maxParticipants: 45,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning', 'sound-system'],
    contacts: [{ id: '1', name: 'Kevin Ong', number: '+65 6844 2000', email: 'studio@plq.com.sg' }],
    remarks: 'Modular furniture available.',
  },
  {
    name: 'Bishan Park Conference Room',
    address: '1 Bishan Street 22, Singapore 579766',
    description: 'Quiet conference room away from the CBD. Capacity: 25 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 200.0,
    maxParticipants: 25,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi'],
    contacts: [{ id: '1', name: 'Mei Lin Tan', number: '+65 6456 7890', email: 'conf@bishanpark.com.sg' }],
    remarks: 'Tea and coffee included.',
  },
  {
    name: 'Harbourfront Exhibition Hall B',
    address: '1 Maritime Square, Singapore 099253',
    description: 'Spacious exhibition hall suitable for large events. Capacity: 150 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 900.0,
    maxParticipants: 150,
    perHeadPriceIfMaxExceed: 6.0,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'catering'],
    contacts: [{ id: '1', name: 'Jeffrey Wee', number: '+65 6377 6688', email: 'events.b@harbourfront.com.sg' }],
    remarks: 'Full event management team available.',
  },
  {
    name: 'Ang Mo Kio Community Centre Hall',
    address: '795 Ang Mo Kio Ave 1, Singapore 569976',
    description: 'Community centre training hall. Capacity: 80 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 300.0,
    maxParticipants: 80,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Rajesh Kumar', number: '+65 6452 1000', email: 'hall@amkcc.com.sg' }],
    remarks: 'Shared facilities with community centre.',
  },
  {
    name: 'Dhoby Ghaut Green Seminar Room',
    address: '10 Penang Road, Singapore 238462',
    description: 'Central location seminar room. Capacity: 28 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 380.0,
    maxParticipants: 28,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Clara Ho', number: '+65 6737 0811', email: 'seminar@dhoby.com.sg' }],
    remarks: 'Walking distance from Dhoby Ghaut MRT.',
  },
  {
    name: 'Woodlands Civic Centre Room 4',
    address: '900 South Woodlands Drive, Singapore 730900',
    description: 'Government-linked civic centre room. Capacity: 30 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 180.0,
    maxParticipants: 30,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi'],
    contacts: [{ id: '1', name: 'Bernard Soh', number: '+65 6367 0456', email: 'venue@woodlandscivic.gov.sg' }],
    remarks: 'Government ID required for access.',
  },
  {
    name: 'Changi Business Park Innovation Hub',
    address: '1 Changi Business Park Avenue 1, Singapore 486058',
    description: 'Modern innovation hub with co-working training spaces. Capacity: 55 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 600.0,
    maxParticipants: 55,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'flip-charts'],
    contacts: [{ id: '1', name: 'Natalie Pang', number: '+65 6545 3000', email: 'hub@cbp.com.sg' }],
    remarks: 'Shuttle bus from Expo MRT available.',
  },
  {
    name: 'Clementi Civic Hall',
    address: '3155 Commonwealth Ave West, Singapore 129588',
    description: 'Civic hall suitable for larger training sessions. Capacity: 90 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 420.0,
    maxParticipants: 90,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Ivan Lau', number: '+65 6777 2234', email: 'hall@clementicicvic.com.sg' }],
    remarks: 'Ample parking available.',
  },
  {
    name: 'Toa Payoh Hub Training Room',
    address: '480 Lorong 6 Toa Payoh, Singapore 310480',
    description: 'Central HDB hub training room. Capacity: 40 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 260.0,
    maxParticipants: 40,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi'],
    contacts: [{ id: '1', name: 'Suresh Nair', number: '+65 6353 9000', email: 'training@tphtub.com.sg' }],
    remarks: 'Located near Toa Payoh MRT.',
  },
  {
    name: 'Orchard Central Event Space',
    address: '181 Orchard Road, Singapore 238896',
    description: 'Premium Orchard belt event space. Capacity: 70 pax',
    venueType: 'HOTEL' as const,
    feeType: 'PER_VENUE' as const,
    fee: 750.0,
    maxParticipants: 70,
    status: VenueStatus.INACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'catering'],
    contacts: [{ id: '1', name: 'Amanda Foo', number: '+65 6238 1234', email: 'events@orchardcentral.com.sg' }],
    remarks: 'Currently under renovation; expected to reopen Q2 2026.',
  },
  {
    name: 'Geylang Serai Cultural Hub Room 2',
    address: '1 Engku Aman Road, Singapore 408528',
    description: 'Cultural hub training room in the east. Capacity: 32 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 220.0,
    maxParticipants: 32,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Fauziah Abdullah', number: '+65 6741 2222', email: 'room2@gsculturalhub.com.sg' }],
    remarks: 'Near Paya Lebar MRT.',
  },
  {
    name: 'Alexandra Technopark Studio',
    address: '438C Alexandra Road, Singapore 119976',
    description: 'Tech-focused training studio. Capacity: 35 pax',
    venueType: 'CLIENT_FACILITY' as const,
    feeType: 'PER_VENUE' as const,
    fee: 480.0,
    maxParticipants: 35,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'whiteboard', 'wifi', 'air-conditioning', 'flip-charts'],
    contacts: [{ id: '1', name: 'Tom Weng', number: '+65 6278 8000', email: 'studio@alexandratech.com.sg' }],
    remarks: 'High-speed fibre WiFi for digital learning.',
  },
  {
    name: 'Buona Vista Science Hub Auditorium',
    address: '31 Biopolis Way, Singapore 138669',
    description: 'Tiered auditorium for large-scale training. Capacity: 120 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_VENUE' as const,
    fee: 850.0,
    maxParticipants: 120,
    perHeadPriceIfMaxExceed: 7.0,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'sound-system', 'wifi', 'air-conditioning', 'catering'],
    contacts: [{ id: '1', name: 'Dr. Shirley Kwan', number: '+65 6478 8888', email: 'auditorium@sciencehub.com.sg' }],
    remarks: 'Used by research institutions. Booking 2 weeks in advance required.',
  },
  {
    name: 'Queenstown Learning Lab',
    address: '1 Queensway, Singapore 149053',
    description: 'Compact e-learning lab with individual workstations. Capacity: 20 pax',
    venueType: 'ON_PREMISE' as const,
    feeType: 'PER_HEAD' as const,
    fee: 18.0,
    maxParticipants: 20,
    status: VenueStatus.ACTIVE,
    facilities: ['projector', 'wifi', 'air-conditioning'],
    contacts: [{ id: '1', name: 'Wendy Loh', number: '+65 6479 0001', email: 'lab@queenstown.edu.sg' }],
    remarks: 'Per-head pricing. Computer workstations included.',
  },
];

async function main() {
  console.log('🌱 Seeding 20 dummy venues...');

  let created = 0;
  let skipped = 0;

  for (const venue of dummyVenues) {
    const existing = await prisma.venue.findFirst({ where: { name: venue.name } });

    if (existing) {
      console.log(`  ⏭  Skipped (already exists): ${venue.name}`);
      skipped++;
      continue;
    }

    await prisma.venue.create({
      data: {
        name: venue.name,
        address: venue.address,
        description: venue.description,
        venueType: venue.venueType as any,
        feeType: venue.feeType as any,
        fee: venue.fee,
        maxParticipants: venue.maxParticipants ?? null,
        perHeadPriceIfMaxExceed: venue.perHeadPriceIfMaxExceed ?? null,
        status: venue.status,
        facilities: venue.facilities,
        contacts: venue.contacts as any,
        remarks: venue.remarks ?? null,
      },
    });

    console.log(`  ✅ Created: ${venue.name}`);
    created++;
  }

  console.log(`\n🏢 Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
