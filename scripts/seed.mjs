import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const STORAGE_DIR = path.resolve(process.cwd(), 'storage/prescriptions');

async function main() {
  console.log('🌱 Starting database seed...');

  // Ensure storage directory exists
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Common demo password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Healthcare@2026', salt);

  // 1. Create Pharmacy Providers
  console.log('📦 Seeding Pharmacy Providers...');
  const providersData = [
    {
      name: 'Tata 1mg',
      slug: 'tata-1mg',
      website: 'https://www.1mg.com',
      serviceRegion: 'Pan-India',
      connectionType: 'API_INTEGRATED',
      isActive: true,
      description: 'Digital healthcare platform offering medicine delivery, lab testing, and e-consultations.',
      apiNotes: 'Direct API sandbox available for verified partner clinics.',
    },
    {
      name: 'PharmEasy',
      slug: 'pharmeasy',
      website: 'https://pharmeasy.in',
      serviceRegion: 'Pan-India',
      connectionType: 'DIRECTORY_LINK',
      isActive: true,
      description: 'Online medicine ordering and diagnostic lab test booking platform.',
      apiNotes: 'Partner redirect integration with tracking token.',
    },
    {
      name: 'Apollo 24|7',
      slug: 'apollo-247',
      website: 'https://www.apollo247.com',
      serviceRegion: 'Pan-India & International',
      connectionType: 'API_INTEGRATED',
      isActive: true,
      description: 'Omnichannel healthcare delivery platform backed by Apollo Hospitals Group.',
      apiNotes: 'Apollo Health Enterprise API connector active.',
    },
    {
      name: 'Netmeds',
      slug: 'netmeds',
      website: 'https://www.netmeds.com',
      serviceRegion: 'Pan-India',
      connectionType: 'DIRECTORY_LINK',
      isActive: true,
      description: 'Certified online pharmacy providing prescription medicines and OTC wellness products.',
      apiNotes: 'External referral catalog.',
    },
    {
      name: 'MedPlus',
      slug: 'medplus',
      website: 'https://www.medplusmart.com',
      serviceRegion: 'Pan-India retail store network',
      connectionType: 'DIRECTORY_LINK',
      isActive: true,
      description: 'Leading retail pharmacy chain with web store and store pickup options.',
      apiNotes: 'Directory locator link only.',
    },
    {
      name: 'Truemeds',
      slug: 'truemeds',
      website: 'https://www.truemeds.in',
      serviceRegion: 'Selected Indian Cities',
      connectionType: 'DIRECTORY_LINK',
      isActive: true,
      description: 'Generic medicine recommendation and delivery service.',
      apiNotes: 'Web link redirect.',
    },
    {
      name: 'PharmPets (Pending Client Confirmation)',
      slug: 'pharm-pets',
      website: 'https://example.com/pharmpets-pending-verification',
      serviceRegion: 'Unverified / Veterinary Care',
      connectionType: 'NOT_CONNECTED',
      isActive: false,
      description: 'Entry retained in catalog pending client confirmation of exact corporate legal name, license, and official domain.',
      apiNotes: 'Integration disabled until verified by platform Super Admin.',
    },
  ];

  const createdProviders = {};
  for (const prov of providersData) {
    const p = await prisma.pharmacyProvider.upsert({
      where: { slug: prov.slug },
      update: prov,
      create: prov,
    });
    createdProviders[prov.slug] = p;
  }

  // 2. Create Organizations
  console.log('🏥 Seeding Organizations...');
  const orgApollo = await prisma.organization.upsert({
    where: { slug: 'apollo-health-city' },
    update: {},
    create: {
      name: 'Apollo Health City',
      slug: 'apollo-health-city',
      licenseNumber: 'AP-MED-2024-8841',
      email: 'contact@apollo-city.org',
      phone: '+914023607777',
      address: 'Jubilee Hills, Road No 72',
      city: 'Hyderabad',
      country: 'India',
    },
  });

  const orgMax = await prisma.organization.upsert({
    where: { slug: 'max-care-clinic' },
    update: {},
    create: {
      name: 'Max Care Multispeciality Clinic',
      slug: 'max-care-clinic',
      licenseNumber: 'DL-CLINIC-2023-1102',
      email: 'desk@maxcareclinic.org',
      phone: '+911140556677',
      address: 'Saket Institutional Area',
      city: 'New Delhi',
      country: 'India',
    },
  });

  // 3. Create Users
  console.log('👤 Seeding Users & Roles...');
  
  // Super Admin (Platform-wide)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@doctorcare.saas' },
    update: { passwordHash, role: 'SUPER_ADMIN', status: 'ACTIVE', mfaEnabled: true },
    create: {
      email: 'superadmin@doctorcare.saas',
      fullName: 'Vikramaditya Rao (Super Admin)',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mfaEnabled: true,
      phone: '+919900000001',
    },
  });

  // Admin for Apollo Health City
  const apolloAdmin = await prisma.user.upsert({
    where: { email: 'admin@apollo.org' },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE', organizationId: orgApollo.id },
    create: {
      email: 'admin@apollo.org',
      fullName: 'Sunil Nair (Clinic Admin)',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      organizationId: orgApollo.id,
      phone: '+919900000002',
    },
  });

  // Doctor 1: Dr. Rajesh Sharma (Apollo)
  const drSharma = await prisma.user.upsert({
    where: { email: 'dr.sharma@apollo.org' },
    update: { passwordHash, role: 'DOCTOR', status: 'ACTIVE', organizationId: orgApollo.id },
    create: {
      email: 'dr.sharma@apollo.org',
      fullName: 'Dr. Rajesh Sharma',
      passwordHash,
      role: 'DOCTOR',
      status: 'ACTIVE',
      organizationId: orgApollo.id,
      phone: '+919876500001',
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: drSharma.id },
    update: {
      preferredPharmacyId: createdProviders['tata-1mg']?.id,
      pharmacyNotes: 'Preferred for home delivery of regular cardiac prescriptions.',
    },
    create: {
      userId: drSharma.id,
      specialization: 'Senior Consultant Cardiologist',
      registrationNumber: 'MCI-CARD-2011-4829',
      clinicName: 'Apollo Heart Institute - OPD Suite 4',
      clinicAddress: 'Jubilee Hills, Hyderabad',
      maxDelegates: 3,
      preferredPharmacyId: createdProviders['tata-1mg']?.id,
      pharmacyNotes: 'Preferred for home delivery of regular cardiac prescriptions.',
    },
  });

  // Doctor 2: Dr. Ananya Patel (Apollo)
  const drPatel = await prisma.user.upsert({
    where: { email: 'dr.patel@apollo.org' },
    update: { passwordHash, role: 'DOCTOR', status: 'ACTIVE', organizationId: orgApollo.id },
    create: {
      email: 'dr.patel@apollo.org',
      fullName: 'Dr. Ananya Patel',
      passwordHash,
      role: 'DOCTOR',
      status: 'ACTIVE',
      organizationId: orgApollo.id,
      phone: '+919876500002',
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: drPatel.id },
    update: {
      preferredPharmacyId: createdProviders['apollo-247']?.id,
    },
    create: {
      userId: drPatel.id,
      specialization: 'Consultant Pediatrician',
      registrationNumber: 'MCI-PED-2016-9281',
      clinicName: 'Apollo Child Wellness Care',
      clinicAddress: 'Jubilee Hills, Hyderabad',
      maxDelegates: 3,
      preferredPharmacyId: createdProviders['apollo-247']?.id,
      pharmacyNotes: 'Pediatric syrups and vaccination inventory preferred at Apollo pharmacy.',
    },
  });

  // Delegated Staff: Priya Nair (Assigned to Dr. Sharma)
  const staffPriya = await prisma.user.upsert({
    where: { email: 'staff.priya@apollo.org' },
    update: { passwordHash, role: 'DELEGATED_STAFF', status: 'ACTIVE', organizationId: orgApollo.id },
    create: {
      email: 'staff.priya@apollo.org',
      fullName: 'Priya Nair (Clinical Assistant)',
      passwordHash,
      role: 'DELEGATED_STAFF',
      status: 'ACTIVE',
      organizationId: orgApollo.id,
      phone: '+919876500099',
    },
  });

  // Set up delegation for Priya under Dr. Sharma
  const priyaPermissions = JSON.stringify([
    'VIEW_PATIENTS',
    'SEARCH_PATIENTS',
    'UPDATE_PATIENT_DETAILS',
    'ADD_NOTES',
    'UPLOAD_DOCUMENTS',
    'VIEW_PRESCRIPTIONS',
    'DOWNLOAD_PRESCRIPTIONS',
    'VIEW_REPORTS',
  ]);

  await prisma.delegatedAccess.deleteMany({
    where: { doctorId: drSharma.id, invitedEmail: 'staff.priya@apollo.org' },
  });

  await prisma.delegatedAccess.create({
    data: {
      doctorId: drSharma.id,
      staffUserId: staffPriya.id,
      invitedEmail: 'staff.priya@apollo.org',
      invitedName: 'Priya Nair',
      status: 'ACTIVE',
      permissions: priyaPermissions,
    },
  });

  // Create a pending invitation for Dr. Sharma (2nd delegate slot)
  await prisma.delegatedAccess.deleteMany({
    where: { doctorId: drSharma.id, invitedEmail: 'kavita.nurse@apollo.org' },
  });

  await prisma.delegatedAccess.create({
    data: {
      doctorId: drSharma.id,
      invitedEmail: 'kavita.nurse@apollo.org',
      invitedName: 'Kavita Iyer (Junior Nurse)',
      status: 'PENDING',
      token: 'inv_demo_kavita_2026_token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      permissions: JSON.stringify(['VIEW_PATIENTS', 'SEARCH_PATIENTS', 'UPLOAD_DOCUMENTS']),
    },
  });

  // Doctor 3: Dr. Vikram Gupta (Max Care Clinic)
  const drGupta = await prisma.user.upsert({
    where: { email: 'dr.gupta@maxcare.org' },
    update: { passwordHash, role: 'DOCTOR', status: 'ACTIVE', organizationId: orgMax.id },
    create: {
      email: 'dr.gupta@maxcare.org',
      fullName: 'Dr. Vikram Gupta',
      passwordHash,
      role: 'DOCTOR',
      status: 'ACTIVE',
      organizationId: orgMax.id,
      phone: '+919876500003',
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: drGupta.id },
    update: {},
    create: {
      userId: drGupta.id,
      specialization: 'Internal Medicine Specialist',
      registrationNumber: 'DMC-MED-2009-3321',
      clinicName: 'Max Care OPD Block B',
      clinicAddress: 'Saket, New Delhi',
      maxDelegates: 3,
      preferredPharmacyId: createdProviders['medplus']?.id,
    },
  });

  // 4. Create Sample Patients
  console.log('🧑‍⚕️ Seeding Patients & Prescriptions...');

  const patientsData = [
    {
      code: 'PAT-202610-101',
      name: 'Ramesh Kumar',
      phone: '+919876543210',
      email: 'ramesh.kumar@example.com',
      dob: new Date('1978-04-12'),
      gender: 'Male',
      address: 'Plot 45, Jubilee Enclave, Hyderabad',
      emergencyName: 'Meena Kumar (Wife)',
      emergencyPhone: '+919876543211',
      notes: 'Hypertension stage 2. Regular follow-up every 3 months. Salt-restricted diet recommended.',
      doctorId: drSharma.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Cardiology Follow-up Prescription & Regimen',
          category: 'PRESCRIPTION',
          daysAgo: 2,
          content: `APOLLO HEART INSTITUTE
Prescription Ref: RX-2026-0891
Patient: Ramesh Kumar (PAT-202610-101)
Doctor: Dr. Rajesh Sharma, MD (Cardiology)
Date: 20 Oct 2026

Rx:
1. Tab. Telmisartan 40mg - 1 tablet once daily morning after breakfast (30 days)
2. Tab. Amlodipine 5mg - 1 tablet at night (30 days)
3. Tab. Atorvastatin 10mg - 1 tablet at bedtime (30 days)
4. Tab. Aspirin 75mg - 1 tablet post lunch (30 days)

Advice:
- Monitor BP weekly at home; record readings in log.
- Daily brisk walking for 30 minutes.
- Review after 4 weeks with Lipid Profile and serum creatinine.`,
        },
        {
          title: 'ECG & Echocardiography Report',
          category: 'DIAGNOSTIC_IMAGING',
          daysAgo: 14,
          content: `APOLLO DIAGNOSTICS & CARDIAC LAB
Diagnostic Investigation Report: PAT-202610-101
Investigation: 2D Doppler Echocardiography
Findings:
- Left Ventricular Ejection Fraction (LVEF): 58%
- Concentric LV hypertrophy noted.
- Grade 1 Diastolic Dysfunction.
- Normal valves; no pericardial effusion.
Signed: Senior Radiologist & Cardiac Sonographer`,
        },
      ],
    },
    {
      code: 'PAT-202610-102',
      name: 'Sunita Verma',
      phone: '+919812345678',
      email: 'sunita.verma@example.com',
      dob: new Date('1985-09-23'),
      gender: 'Female',
      address: 'Flat 302, Green Meadows, Banjara Hills, Hyderabad',
      emergencyName: 'Alok Verma (Husband)',
      emergencyPhone: '+919812345679',
      notes: 'Palpitations and borderline thyroid levels. Referred for Holter evaluation.',
      doctorId: drSharma.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Anti-Arrhythmic & Anxiolytic Consultation Rx',
          category: 'PRESCRIPTION',
          daysAgo: 5,
          content: `APOLLO HOSPITALS HYDERABAD
Consultation Slip - Dr. Rajesh Sharma
Patient: Sunita Verma (PAT-202610-102)

Rx:
1. Tab. Propranolol 20mg - Half tablet twice daily for 2 weeks
2. Tab. Magnesium Glycinate 500mg - 1 tablet at night
3. Serum TSH, Free T3, Free T4 to be rechecked in 6 weeks.`,
        },
      ],
    },
    {
      code: 'PAT-202610-103',
      name: 'Aarav Mehta',
      phone: '+919898765432',
      email: 'aarav.mehta@example.com',
      dob: new Date('1992-01-15'),
      gender: 'Male',
      address: 'Hitech City, Hyderabad',
      emergencyName: 'Neha Mehta (Sister)',
      emergencyPhone: '+919898765433',
      notes: 'Post-viral myocarditis recovery check. Excellent recovery noted.',
      doctorId: drSharma.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Post-Viral Recovery Discharge Summary',
          category: 'DISCHARGE_SUMMARY',
          daysAgo: 25,
          content: `APOLLO HEALTH CITY - DISCHARGE SUMMARY
Patient: Aarav Mehta
Diagnosis: Resolving Acute Viral Myocarditis
Admit Date: 20 Sep 2026 | Discharge Date: 27 Sep 2026
Condition at Discharge: Hemodynamically stable.
Medications on Discharge: Metoprolol Tartrate 12.5mg BD x 4 weeks.`,
        },
      ],
    },
    {
      code: 'PAT-202610-104',
      name: 'Deepa Reddy',
      phone: '+919765432109',
      email: 'deepa.reddy@example.com',
      dob: new Date('1964-11-30'),
      gender: 'Female',
      address: 'Madhapur, Hyderabad',
      emergencyName: 'Kishore Reddy (Son)',
      emergencyPhone: '+919765432100',
      notes: 'Type 2 Diabetes Mellitus with Dyslipidemia and Coronary Artery Disease.',
      doctorId: drSharma.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Comprehensive Diabetic & Cardiac Management',
          category: 'PRESCRIPTION',
          daysAgo: 1,
          content: `APOLLO HEART INSTITUTE
Patient: Deepa Reddy (PAT-202610-104)
Dr. Rajesh Sharma

Rx:
1. Tab. Dapagliflozin 10mg - 1 OD morning
2. Tab. Metformin SR 500mg - 1 BD after meals
3. Tab. Rosuvastatin 20mg - 1 HS
4. Tab. Bisoprolol 2.5mg - 1 OD morning`,
        },
      ],
    },
    {
      code: 'PAT-202610-201',
      name: 'Kabir Sen (Child)',
      phone: '+919123456780',
      email: 'parent.sen@example.com',
      dob: new Date('2021-06-18'),
      gender: 'Male',
      address: 'Kondapur, Hyderabad',
      emergencyName: 'Rohit Sen (Father)',
      emergencyPhone: '+919123456780',
      notes: 'Mild seasonal bronchiolitis. Pediatric allergy follow-up.',
      doctorId: drPatel.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Pediatric Bronchodilator & Antihistamine Rx',
          category: 'PRESCRIPTION',
          daysAgo: 3,
          content: `APOLLO CHILD WELLNESS CARE
Dr. Ananya Patel (MD Pediatrics)
Patient: Kabir Sen (Age: 5 yrs)

Rx:
1. Syp. Levocetirizine 2.5ml OD at night for 5 days
2. Syp. Salbutamol 2.5ml SOS for wheezing (max TDS)
3. Saline nasal drops 2 drops in both nostrils BD`,
        },
      ],
    },
    {
      code: 'PAT-202610-202',
      name: 'Anvi Joshi (Infant)',
      phone: '+919234567891',
      email: 'mrs.joshi@example.com',
      dob: new Date('2025-12-05'),
      gender: 'Female',
      address: 'Gachibowli, Hyderabad',
      emergencyName: 'Sanjay Joshi (Father)',
      emergencyPhone: '+919234567891',
      notes: '10-month routine vaccination and growth milestone review.',
      doctorId: drPatel.id,
      orgId: orgApollo.id,
      prescriptions: [
        {
          title: 'Routine Pediatric Growth & Immunization Chart',
          category: 'LAB_REPORT',
          daysAgo: 7,
          content: `APOLLO WELL BABY CLINIC
Child: Anvi Joshi
Weight: 8.9 kg | Length: 73 cm | Head Circumference: 44 cm
Milestones: Stands with support, babbling words.
Vaccines Administered: Typhoid Conjugate Vaccine, Vitamin A booster.`,
        },
      ],
    },
  ];

  for (const pat of patientsData) {
    const normalizedPhone = pat.phone.replace(/[^0-9]/g, '');
    const patient = await prisma.patient.upsert({
      where: { patientCode: pat.code },
      update: {
        fullName: pat.name,
        phone: pat.phone,
        normalizedPhone,
        email: pat.email,
        dob: pat.dob,
        gender: pat.gender,
        address: pat.address,
        emergencyContactName: pat.emergencyName,
        emergencyContactPhone: pat.emergencyPhone,
        nonClinicalNotes: pat.notes,
        doctorId: pat.doctorId,
        organizationId: pat.orgId,
      },
      create: {
        patientCode: pat.code,
        fullName: pat.name,
        phone: pat.phone,
        normalizedPhone,
        email: pat.email,
        dob: pat.dob,
        gender: pat.gender,
        address: pat.address,
        emergencyContactName: pat.emergencyName,
        emergencyContactPhone: pat.emergencyPhone,
        nonClinicalNotes: pat.notes,
        doctorId: pat.doctorId,
        organizationId: pat.orgId,
      },
    });

    for (const rx of pat.prescriptions) {
      const fileBuffer = Buffer.from(rx.content, 'utf-8');
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const filename = `${pat.code}-${rx.category.toLowerCase()}-${Date.now() % 10000}.txt`;
      const storageKey = `prescriptions/${patient.id}/${filename}`;
      const localFilePath = path.join(STORAGE_DIR, filename);

      fs.writeFileSync(localFilePath, fileBuffer);

      const docDate = new Date();
      docDate.setDate(docDate.getDate() - rx.daysAgo);

      const existingDoc = await prisma.prescriptionDocument.findFirst({
        where: { patientId: patient.id, title: rx.title },
      });

      if (!existingDoc) {
        await prisma.prescriptionDocument.create({
          data: {
            patientId: patient.id,
            doctorId: pat.doctorId,
            organizationId: pat.orgId,
            uploadedById: pat.doctorId,
            title: rx.title,
            category: rx.category,
            documentDate: docDate,
            storageKey: filename, // Store filename relative to storage vault
            fileHash,
            fileSize: fileBuffer.length,
            mimeType: 'text/plain',
            originalFilename: filename,
            isFinalized: true,
            currentVersion: 1,
            versions: {
              create: {
                versionNumber: 1,
                storageKey: filename,
                fileHash,
                fileSize: fileBuffer.length,
                mimeType: 'text/plain',
                originalFilename: filename,
                reasonForCorrection: 'Original document issued upon clinical consultation.',
                createdById: pat.doctorId,
              },
            },
          },
        });
      }
    }
  }

  // 5. Seed Audit Events
  console.log('🛡️ Seeding Security & Audit Events...');
  const sampleAuditEvents = [
    {
      orgId: orgApollo.id,
      userId: superAdmin.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: superAdmin.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: JSON.stringify({ mfaVerified: true, method: 'PASSWORD_AND_TOTP' }),
    },
    {
      orgId: orgApollo.id,
      userId: apolloAdmin.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: apolloAdmin.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: JSON.stringify({ method: 'PASSWORD' }),
    },
    {
      orgId: orgApollo.id,
      userId: drSharma.id,
      action: 'PATIENT_CREATE',
      resourceType: 'PATIENT',
      resourceId: 'PAT-202610-101',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: JSON.stringify({ patientName: 'Ramesh Kumar', doctor: 'Dr. Rajesh Sharma' }),
    },
    {
      orgId: orgApollo.id,
      userId: drSharma.id,
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'PAT-202610-101',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: JSON.stringify({ category: 'PRESCRIPTION', integrityHashVerified: true }),
    },
    {
      orgId: orgApollo.id,
      userId: drSharma.id,
      action: 'DELEGATE_INVITED',
      resourceType: 'DELEGATE',
      resourceId: 'staff.priya@apollo.org',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      metadata: JSON.stringify({ delegateCount: 1, maxAllowed: 3 }),
    },
  ];

  for (const ev of sampleAuditEvents) {
    await prisma.auditEvent.create({
      data: {
        organizationId: ev.orgId,
        userId: ev.userId,
        action: ev.action,
        resourceType: ev.resourceType,
        resourceId: ev.resourceId,
        ipAddress: ev.ipAddress,
        userAgent: ev.userAgent,
        metadata: ev.metadata,
      },
    });
  }

  // 6. In-App Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: drSharma.id,
        title: 'New Clinical Assistant Activated',
        message: 'Priya Nair has accepted the invitation and is now active as your delegated staff.',
        type: 'SUCCESS',
        isRead: false,
        linkUrl: '/doctor/team',
      },
      {
        userId: drSharma.id,
        title: 'Document Hash Verification Complete',
        message: 'All 4 prescriptions for Ramesh Kumar and Sunita Verma have been verified with SHA-256 hashes.',
        type: 'INFO',
        isRead: true,
        linkUrl: '/doctor/prescriptions',
      },
      {
        userId: apolloAdmin.id,
        title: 'Monthly Upload Milestone',
        message: 'Apollo Health City doctors have uploaded 12 verified clinical documents this billing cycle.',
        type: 'INFO',
        isRead: false,
        linkUrl: '/admin/reports',
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
  console.log('\n--- DEMO LOGIN CREDENTIALS ---');
  console.log('1. Super Admin:      superadmin@doctorcare.saas  | Password: Healthcare@2026 (MFA Enabled)');
  console.log('2. Clinic Admin:     admin@apollo.org            | Password: Healthcare@2026');
  console.log('3. Doctor (Sharma):  dr.sharma@apollo.org        | Password: Healthcare@2026');
  console.log('4. Doctor (Patel):   dr.patel@apollo.org         | Password: Healthcare@2026');
  console.log('5. Delegated Staff:  staff.priya@apollo.org      | Password: Healthcare@2026');
  console.log('6. Doctor (Gupta):   dr.gupta@maxcare.org        | Password: Healthcare@2026');
  console.log('-------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
