import 'dotenv/config';
import { PrismaClient, Role, Sex } from '@prisma/client';
import * as argon2 from 'argon2';
import { encryptField } from '../src/common/crypto/field-crypto';

const prisma = new PrismaClient();

function getEncryptionKey(): Buffer {
  const base64Key = process.env.FIELD_ENCRYPTION_KEY;
  if (!base64Key) throw new Error('FIELD_ENCRYPTION_KEY is not set');
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes');
  return key;
}

// NCDC Integrated Disease Surveillance and Response (IDSR) priority diseases,
// mapped to representative ICD-10 codes. See COMPLIANCE.md §4.
const NOTIFIABLE_DISEASES = [
  { icd10Code: 'A00', name: 'Cholera', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'A98.4', name: 'Lassa fever', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'B05', name: 'Measles', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'A39', name: 'Cerebrospinal meningitis', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'A95', name: 'Yellow fever', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'B04', name: 'Mpox (Monkeypox)', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'A80', name: 'Acute flaccid paralysis (Polio)', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'U07.1', name: 'COVID-19', reportingTimeframe: 'IMMEDIATE' },
  { icd10Code: 'A01.0', name: 'Typhoid fever', reportingTimeframe: 'WEEKLY' },
  { icd10Code: 'B50', name: 'Malaria (severe/complicated)', reportingTimeframe: 'WEEKLY' },
];

async function main() {
  const key = getEncryptionKey();
  const passwordHash = await argon2.hash('ChangeMe123!');

  const facility = await prisma.facility.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo General Hospital',
      nhisFacilityCode: 'NHIS-DEMO-001',
      state: 'Lagos',
      lga: 'Eti-Osa',
      address: '1 Adeola Odeku Street, Victoria Island, Lagos',
      phone: '+2348000000000',
    },
  });

  const staff = [
    { email: 'admin@demo-hospital.ng', fullName: 'Amaka Okafor', role: Role.ADMIN },
    {
      email: 'doctor@demo-hospital.ng',
      fullName: 'Dr. Chidi Nwosu',
      role: Role.DOCTOR,
      licenseNumber: 'MDCN/12345',
      licenseBody: 'MDCN',
    },
    {
      email: 'nurse@demo-hospital.ng',
      fullName: 'Ngozi Balogun',
      role: Role.NURSE,
      licenseNumber: 'NMCN/67890',
      licenseBody: 'NMCN',
    },
    { email: 'records@demo-hospital.ng', fullName: 'Tunde Bello', role: Role.RECORDS_OFFICER },
    {
      email: 'pharmacist@demo-hospital.ng',
      fullName: 'Fatima Sani',
      role: Role.PHARMACIST,
      licenseNumber: 'PCN/54321',
      licenseBody: 'PCN',
    },
    { email: 'labtech@demo-hospital.ng', fullName: 'Emeka Umeh', role: Role.LAB_TECH },
  ];

  for (const member of staff) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        facilityId: facility.id,
        email: member.email,
        passwordHash,
        fullName: member.fullName,
        role: member.role,
        licenseNumber: 'licenseNumber' in member ? member.licenseNumber : undefined,
        licenseBody: 'licenseBody' in member ? member.licenseBody : undefined,
      },
    });
  }

  for (const disease of NOTIFIABLE_DISEASES) {
    await prisma.notifiableDisease.upsert({
      where: { icd10Code: disease.icd10Code },
      update: {},
      create: disease,
    });
  }

  const recordsOfficer = await prisma.user.findUniqueOrThrow({
    where: { email: 'records@demo-hospital.ng' },
  });

  const demoPatients = [
    {
      mrn: 'DGH-000001',
      nin: '12345678901',
      nhisNumber: 'NHIS-9988771',
      surname: 'Adeyemi',
      firstName: 'Folake',
      dateOfBirth: new Date('1990-03-14'),
      sex: Sex.FEMALE,
      phone: '+2348012345678',
      state: 'Lagos',
      lga: 'Eti-Osa',
      bloodGroup: 'O+',
      genotype: 'AA',
    },
    {
      mrn: 'DGH-000002',
      nin: '10987654321',
      nhisNumber: 'NHIS-1122334',
      surname: 'Musa',
      firstName: 'Ibrahim',
      dateOfBirth: new Date('1985-11-02'),
      sex: Sex.MALE,
      phone: '+2348023456789',
      state: 'Kano',
      lga: 'Nassarawa',
      bloodGroup: 'A+',
      genotype: 'AS',
    },
  ];

  for (const p of demoPatients) {
    await prisma.patient.upsert({
      where: { facilityId_mrn: { facilityId: facility.id, mrn: p.mrn } },
      update: {},
      create: {
        facilityId: facility.id,
        mrn: p.mrn,
        ninEncrypted: encryptField(p.nin, key),
        nhisNumber: p.nhisNumber,
        surname: p.surname,
        firstName: p.firstName,
        dateOfBirth: p.dateOfBirth,
        sex: p.sex,
        phoneEncrypted: encryptField(p.phone, key),
        state: p.state,
        lga: p.lga,
        bloodGroup: p.bloodGroup,
        genotype: p.genotype,
        registeredById: recordsOfficer.id,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`Facility: ${facility.name}`);
  // eslint-disable-next-line no-console
  console.log('Demo logins (password: ChangeMe123!):');
  for (const member of staff) {
    // eslint-disable-next-line no-console
    console.log(`  ${member.role.padEnd(16)} ${member.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
