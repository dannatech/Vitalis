import 'dotenv/config';
import { PrismaClient, PayerType, Role, Sex, TariffCategory } from '@prisma/client';
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
    { email: 'billing@demo-hospital.ng', fullName: 'Chioma Eze', role: Role.BILLING_OFFICER },
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

  const selfPayPayer = await prisma.payer.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: 'Self-Pay' } },
    update: {},
    create: { facilityId: facility.id, name: 'Self-Pay', type: PayerType.SELF_PAY },
  });

  const nhisPayer = await prisma.payer.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: 'NHIS' } },
    update: {},
    create: {
      facilityId: facility.id,
      name: 'NHIS',
      type: PayerType.NHIS,
      contactInfo: 'claims@nhis.gov.ng',
    },
  });

  const hmoPayer = await prisma.payer.upsert({
    where: { facilityId_name: { facilityId: facility.id, name: 'Hygeia HMO' } },
    update: {},
    create: {
      facilityId: facility.id,
      name: 'Hygeia HMO',
      type: PayerType.PRIVATE_HMO,
      contactInfo: 'providers@hygeiahmo.com',
    },
  });

  const tariffItems: { name: string; category: TariffCategory; unitPrice: number; code?: string }[] = [
    { name: 'General Consultation', category: TariffCategory.CONSULTATION, unitPrice: 3000 },
    { name: 'Specialist Consultation', category: TariffCategory.CONSULTATION, unitPrice: 8000 },
    { name: 'Full Blood Count', category: TariffCategory.LAB, unitPrice: 2500, code: 'LAB-FBC' },
    { name: 'Malaria Parasite Test', category: TariffCategory.LAB, unitPrice: 1500, code: 'LAB-MP' },
    { name: 'Widal Test', category: TariffCategory.LAB, unitPrice: 2000, code: 'LAB-WIDAL' },
    { name: 'Amoxicillin 500mg (per course)', category: TariffCategory.MEDICATION, unitPrice: 1200 },
    { name: 'Artemether/Lumefantrine (per course)', category: TariffCategory.MEDICATION, unitPrice: 1800 },
    { name: 'Paracetamol 500mg (per course)', category: TariffCategory.MEDICATION, unitPrice: 500 },
    { name: 'Minor Procedure', category: TariffCategory.PROCEDURE, unitPrice: 5000 },
    { name: 'Admission (per day)', category: TariffCategory.ADMISSION, unitPrice: 15000 },
  ];

  for (const item of tariffItems) {
    const existing = await prisma.tariffItem.findFirst({
      where: { facilityId: facility.id, name: item.name, payerId: null },
    });
    if (!existing) {
      await prisma.tariffItem.create({
        data: {
          facilityId: facility.id,
          name: item.name,
          category: item.category,
          unitPrice: item.unitPrice,
          code: item.code,
        },
      });
    }
  }

  const coveredPatient = await prisma.patient.findUniqueOrThrow({
    where: { facilityId_mrn: { facilityId: facility.id, mrn: 'DGH-000001' } },
  });
  const existingCoverage = await prisma.patientCoverage.findFirst({
    where: { patientId: coveredPatient.id, payerId: nhisPayer.id },
  });
  if (!existingCoverage) {
    await prisma.patientCoverage.create({
      data: {
        patientId: coveredPatient.id,
        payerId: nhisPayer.id,
        enrolleeId: 'NHIS-ENR-00123',
        planName: 'Formal Sector Social Health Insurance Programme',
        isPrimary: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Payers: ${selfPayPayer.name}, ${nhisPayer.name}, ${hmoPayer.name}`);
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
