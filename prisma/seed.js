const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Seed Users (Staff: Admin & Management)
  const defaultUsers = [
    {
      name: 'Admin NeraaHotel',
      email: 'admin@neraahotel.com',
      password: 'password123',
      role: 'admin',
    },
    {
      name: 'Manager NeraaHotel',
      email: 'manager@neraahotel.com',
      password: 'password123',
      role: 'management',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await prisma.users.findUnique({
      where: { email: u.email },
    });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await prisma.users.create({
        data: {
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          updated_at: new Date(),
        },
      });
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`User ${u.email} already exists.`);
    }
  }

  // 2. Seed Room Types
  const defaultRoomTypes = [
    {
      name: 'Superior',
      description: 'Superior Room features modern comfort and amenities with a cozy double bed, flat screen TV, and workspace.',
      price: 350000.0,
      foto_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1000',
    },
    {
      name: 'Deluxe',
      description: 'Deluxe Room offers spacious room layout, premium bedding, a beautiful city view, and complementary minibar.',
      price: 550000.0,
      foto_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1000',
    },
    {
      name: 'Suite',
      description: 'Suite Room is the epitome of luxury with a separate living area, king size bed, top-tier amenities, and bathtub.',
      price: 950000.0,
      foto_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1000',
    },
  ];

  const seededRoomTypes = {};
  for (const rt of defaultRoomTypes) {
    let existing = await prisma.room_types.findUnique({
      where: { name: rt.name },
    });
    if (!existing) {
      existing = await prisma.room_types.create({
        data: {
          name: rt.name,
          description: rt.description,
          price: rt.price,
          foto_url: rt.foto_url,
          updated_at: new Date(),
        },
      });
      console.log(`Created room type: ${rt.name}`);
    } else {
      console.log(`Room type ${rt.name} already exists.`);
    }
    seededRoomTypes[rt.name] = existing.id;
  }

  // 3. Seed Rooms
  const defaultRooms = [
    { room_number: '101', room_type: 'Superior', status: 'available' },
    { room_number: '102', room_type: 'Superior', status: 'available' },
    { room_number: '201', room_type: 'Deluxe', status: 'available' },
    { room_number: '202', room_type: 'Deluxe', status: 'available' },
    { room_number: '301', room_type: 'Suite', status: 'available' },
  ];

  for (const r of defaultRooms) {
    const existing = await prisma.rooms.findUnique({
      where: { room_number: r.room_number },
    });
    if (!existing) {
      const typeId = seededRoomTypes[r.room_type];
      await prisma.rooms.create({
        data: {
          room_number: r.room_number,
          status: r.status,
          room_type_id: typeId,
          updated_at: new Date(),
        },
      });
      console.log(`Created room: ${r.room_number} (${r.room_type})`);
    } else {
      console.log(`Room ${r.room_number} already exists.`);
    }
  }

  // 4. Seed Restaurant Menus
  const defaultMenus = [
    {
      name: 'Nasi Goreng Special',
      description: 'Traditional Indonesian fried rice served with fried egg, fried chicken, crackers, and pickles.',
      price: 25000.0,
      foto_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1000',
    },
    {
      name: 'Ayam Goreng Kalasan',
      description: 'Crispy Indonesian fried chicken seasoned with traditional spices, served with sambal and fresh vegetables.',
      price: 35000.0,
      foto_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1000',
    },
    {
      name: 'Es Teh Manis',
      description: 'Chilled sweet jasmine tea.',
      price: 5000.0,
      foto_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=1000',
    },
    {
      name: 'Kopi Hitam',
      description: 'Strong hot black coffee brewed from premium local Gayo beans.',
      price: 8000.0,
      foto_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000',
    },
  ];

  for (const m of defaultMenus) {
    const existing = await prisma.restaurant_menus.findUnique({
      where: { name: m.name },
    });
    if (!existing) {
      await prisma.restaurant_menus.create({
        data: {
          name: m.name,
          description: m.description,
          price: m.price,
          foto_url: m.foto_url,
          updated_at: new Date(),
        },
      });
      console.log(`Created restaurant menu: ${m.name}`);
    } else {
      console.log(`Menu ${m.name} already exists.`);
    }
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
