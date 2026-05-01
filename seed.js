const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const Member = require('./models/Member');

dotenv.config();

const PACKAGE_FEES = {
  '1_month': 800,
  '2_months': 1500,
  '3_months': 2200,
  '6_months': 4000,
  '1_year': 7000,
};

const PACKAGES = ['1_month', '2_months', '3_months', '6_months', '1_year'];
const TIMES = ['morning', 'evening', '06:00 AM', '07:00 AM'];

const FIRST_NAMES = [
  'Aarav', 'Aditya', 'Ajay', 'Akash', 'Amit', 'Ananya', 'Anita', 'Anjali',
  'Arjun', 'Arun', 'Bhavna', 'Deepak', 'Divya', 'Ganesh', 'Geeta', 'Harini',
  'Harsh', 'Ishita', 'Jyoti', 'Kartik', 'Kavya', 'Kiran', 'Kritika', 'Lakshmi',
  'Latha', 'Manoj', 'Manish', 'Meera', 'Mohit', 'Nandini', 'Naveen', 'Nikhil',
  'Nisha', 'Pallavi', 'Pavan', 'Pooja', 'Preethi', 'Priya', 'Rahul', 'Rajesh',
  'Ramesh', 'Ravi', 'Rekha', 'Rohan', 'Sanjay', 'Santosh', 'Shruti', 'Shweta',
  'Siddharth', 'Smita', 'Sneha', 'Sudeep', 'Suraj', 'Suresh', 'Tanvi', 'Tarun',
  'Usha', 'Varsha', 'Vijay', 'Vikram', 'Vivek', 'Yamini',
];

const LAST_NAMES = [
  'Agarwal', 'Bajaj', 'Bhat', 'Bhatt', 'Bhosle', 'Bose', 'Chauhan', 'Chopra',
  'Choudhary', 'Desai', 'Deshpande', 'Dixit', 'Ghosh', 'Gupta', 'Hegde',
  'Iyer', 'Jain', 'Joshi', 'Kapoor', 'Krishnan', 'Kulkarni', 'Kumar',
  'Malhotra', 'Malviya', 'Mehta', 'Menon', 'Murugan', 'Nair', 'Naik',
  'Narayanan', 'Nambiar', 'Pandit', 'Pandey', 'Patil', 'Pillai', 'Prasad',
  'Rao', 'Reddy', 'Roy', 'Saxena', 'Shah', 'Sharma', 'Shetty', 'Singh',
  'Soni', 'Srinivasan', 'Subramanian', 'Tiwari', 'Tomar', 'Tripathi',
  'Venkat', 'Verma', 'Wagh', 'Yadav',
];

function pick(arr, idx) {
  return arr[idx % arr.length];
}

function buildMembers() {
  const members = [];
  let idx = 0;
  const usedNames = new Set();

  // Generate months: Jan 2024 → Apr 2026
  const months = [];
  for (let y = 2024; y <= 2026; y++) {
    const maxMonth = y === 2026 ? 4 : 12;
    for (let m = 1; m <= maxMonth; m++) {
      months.push({ year: y, month: m });
    }
  }

  // Distribute members: 7–9 per month to exceed 200 total
  const perMonth = [8, 7, 8, 7, 8, 8, 7, 8, 7, 8, 8, 7, // 2024
                    8, 7, 8, 8, 7, 8, 7, 8, 8, 7, 8, 7, // 2025
                    8, 7, 8, 9];                          // 2026 Jan–Apr

  months.forEach(({ year, month }, mi) => {
    const count = perMonth[mi] || 7;
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let k = 0; k < count; k++) {
      const day = Math.floor((k / count) * daysInMonth) + 1;

      // Unique name
      let firstName, lastName, fullName;
      let attempt = 0;
      do {
        firstName = pick(FIRST_NAMES, idx + attempt * 7);
        lastName = pick(LAST_NAMES, idx + attempt * 13 + mi);
        fullName = `${firstName} ${lastName}`;
        attempt++;
      } while (usedNames.has(fullName) && attempt < 20);
      usedNames.add(fullName);

      const pkg = pick(PACKAGES, idx + mi + k);
      const joiningTime = pick(TIMES, idx + k);
      const phone = `98765${String(idx + 1).padStart(5, '0')}`;
      const hasEmail = (idx % 3) !== 0;
      const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

      members.push({
        name: fullName,
        phone,
        email: hasEmail ? `${emailName}@example.com` : '',
        joiningDate: new Date(year, month - 1, day),
        packageType: pkg,
        joiningTime,
        amount: PACKAGE_FEES[pkg],
        notes: '',
      });

      idx++;
    }
  });

  return members;
}

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Admin.deleteMany({});
    await Member.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const admin = await Admin.create({
      name: 'GymX Admin',
      email: 'admin@gymx.com',
      password: 'admin123',
    });
    console.log(`✅ Admin created: ${admin.email} / password: admin123`);

    const members = buildMembers();
    for (const memberData of members) {
      await Member.create(memberData);
    }
    console.log(`✅ Created ${members.length} members across Jan 2024 – Apr 2026`);

    console.log('\n🎉 Seed complete!');
    console.log('📧 Login: admin@gymx.com');
    console.log('🔑 Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
