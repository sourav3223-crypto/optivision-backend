const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OptiVision...');

  const store = await prisma.store.upsert({
    where: { id: 'store-main-01' },
    update: {},
    create: { id: 'store-main-01', name: 'OptiVision Optical Store', address: '123 Vision Street, Mumbai', phone: '+91-9876543210', email: 'info@optivision.in', gstNumber: '27AABCU9603R1ZX', taxRate: 18, invoicePrefix: 'INV', invoiceCounter: 1050 }
  });

  const adminHash = await bcrypt.hash('Admin@123', 12);
  const staffHash = await bcrypt.hash('Staff@123', 12);

  await prisma.user.upsert({ where: { email: 'admin@optivision.in' }, update: {}, create: { storeId: store.id, name: 'Admin User', email: 'admin@optivision.in', phone: '+91-9876543210', passwordHash: adminHash, role: 'SHOP_ADMIN' } });
  await prisma.user.upsert({ where: { email: 'priya@optivision.in' }, update: {}, create: { storeId: store.id, name: 'Priya Sharma', email: 'priya@optivision.in', phone: '+91-9876543211', passwordHash: staffHash, role: 'STAFF' } });
  await prisma.user.upsert({ where: { email: 'rahul@optivision.in' }, update: {}, create: { storeId: store.id, name: 'Rahul Verma', email: 'rahul@optivision.in', phone: '+91-9876543212', passwordHash: staffHash, role: 'STAFF' } });

  const frames = [];
  const framesData = [
    { frameCode:'TIT-001', brand:'Titan', model:'Octane', shape:'RECTANGLE', color:'Gunmetal', purchasePrice:800, sellingPrice:1999, stockQty:15, lowStockAlert:5, barcode:'TIT001' },
    { frameCode:'TIT-002', brand:'Titan', model:'Edge', shape:'SQUARE', color:'Black', purchasePrice:950, sellingPrice:2499, stockQty:12, lowStockAlert:4, barcode:'TIT002' },
    { frameCode:'RAY-001', brand:'Ray-Ban', model:'Clubmaster', shape:'WAYFARER', color:'Tortoise', purchasePrice:3500, sellingPrice:8499, stockQty:8, lowStockAlert:3, barcode:'RAY001' },
    { frameCode:'LNK-001', brand:'Lenskart', model:'Air Classic', shape:'OVAL', color:'Silver', purchasePrice:400, sellingPrice:999, stockQty:25, lowStockAlert:8, barcode:'LNK001' },
    { frameCode:'FAS-001', brand:'Fastrack', model:'Reflex', shape:'RECTANGLE', color:'Blue', purchasePrice:350, sellingPrice:899, stockQty:3, lowStockAlert:5, barcode:'FAS001' },
  ];
  for (const f of framesData) frames.push(await prisma.frame.create({ data: { storeId: store.id, ...f } }));

  const lenses = [];
  const lensesData = [
    { name:'Basic Clear (1.50)', lensType:'SINGLE_VISION', lensIndex:'1.50', coating:['Anti-Glare'], brand:'Essilor', purchasePrice:300, sellingPrice:799, stockQty:200 },
    { name:'Standard Blue Cut (1.56)', lensType:'SINGLE_VISION', lensIndex:'1.56', coating:['Blue Cut','Anti-Glare'], brand:'Essilor', purchasePrice:500, sellingPrice:1299, stockQty:150 },
    { name:'Premium Progressive (1.67)', lensType:'PROGRESSIVE', lensIndex:'1.67', coating:['Blue Cut','Anti-Glare','UV400'], brand:'Zeiss', purchasePrice:3000, sellingPrice:7499, stockQty:40 },
  ];
  for (const l of lensesData) lenses.push(await prisma.lens.create({ data: { storeId: store.id, ...l } }));

  const customers = [];
  const customersData = [
    { name:'Rajesh Kumar', phone:'+91-9812345678', email:'rajesh@email.com', gender:'MALE', age:38 },
    { name:'Priya Patel', phone:'+91-9823456789', email:'priya@email.com', gender:'FEMALE', age:29 },
    { name:'Amit Shah', phone:'+91-9834567890', gender:'MALE', age:45 },
  ];
  for (const c of customersData) customers.push(await prisma.customer.create({ data: { storeId: store.id, ...c } }));

  console.log('🎉 Seed complete!');
  console.log('Admin:  admin@optivision.in / Admin@123');
  console.log('Staff:  priya@optivision.in / Staff@123');
}

main().catch(e => { console.error('❌', e); process.exit(1); }).finally(() => prisma.$disconnect());
