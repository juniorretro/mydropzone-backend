import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@mydropzone.cm' },
    update: {},
    create: { email: 'admin@mydropzone.cm', password: hash, role: 'superadmin', name: 'Admin MDZ' }
  })

  // Livreurs
  const couriers = await Promise.all([
    prisma.courier.upsert({ where: { id: 'courier-1' }, update: {}, create: { id: 'courier-1', name: 'Kevin Fotso', phone: '+237 677 001 001', zone: 'Douala - Akwa', vehicle: 'moto', totalOrders: 342, rating: 4.9, status: 'active', currentLat: 4.052, currentLng: 9.700 } }),
    prisma.courier.upsert({ where: { id: 'courier-2' }, update: {}, create: { id: 'courier-2', name: 'Paul Mvondo', phone: '+237 677 002 002', zone: 'Douala - Bonapriso', vehicle: 'voiture', totalOrders: 215, rating: 4.7, status: 'active', currentLat: 4.061, currentLng: 9.715 } }),
    prisma.courier.upsert({ where: { id: 'courier-3' }, update: {}, create: { id: 'courier-3', name: 'Eric Tambe', phone: '+237 677 003 003', zone: 'Yaoundé Centre', vehicle: 'moto', totalOrders: 189, rating: 4.8, status: 'idle', currentLat: 3.848, currentLng: 11.502 } }),
    prisma.courier.upsert({ where: { id: 'courier-4' }, update: {}, create: { id: 'courier-4', name: 'Carine Belo', phone: '+237 677 004 004', zone: 'Douala - Bassa', vehicle: 'moto', totalOrders: 127, rating: 4.6, status: 'active', currentLat: 4.042, currentLng: 9.685 } }),
    prisma.courier.upsert({ where: { id: 'courier-5' }, update: {}, create: { id: 'courier-5', name: 'Bruno Ngassa', phone: '+237 677 005 005', zone: 'Douala - Deido', vehicle: 'velo', totalOrders: 98, rating: 4.5, status: 'idle', currentLat: 4.055, currentLng: 9.695 } }),
  ])

  // Commandes
  const orders = [
    { id: 'MDZ-2024-001', clientName: 'Jean Kamga', clientPhone: '+237 677 100 001', receiverName: 'Marie Ateba', receiverPhone: '+237 677 200 001', pickupAddress: 'Akwa, face au rond-point Deido', deliveryAddress: 'Bonapriso, Rue des Cocotiers', pickupCity: 'Douala', deliveryCity: 'Douala', orderType: 'local' as const, serviceSpeed: 'express' as const, packageType: 'Petit colis (< 5kg)', weight: 2.5, status: 'in_progress' as const, courierId: 'courier-1', courierName: 'Kevin Fotso', amount: 4000, pickupLat: 4.048, pickupLng: 9.692, deliveryLat: 4.061, deliveryLng: 9.715 },
    { id: 'MDZ-2024-002', clientName: 'Sophie Nkeng', clientPhone: '+237 677 100 002', receiverName: 'Paul Essam', receiverPhone: '+237 677 200 002', pickupAddress: 'Yaoundé Centre, Biyem-Assi', deliveryAddress: 'Douala, Akwa Centre', pickupCity: 'Yaoundé', deliveryCity: 'Douala', orderType: 'intercity' as const, serviceSpeed: 'normal' as const, packageType: 'Document', weight: 0.5, status: 'pending' as const, amount: 5000, pickupLat: 3.848, pickupLng: 11.502, deliveryLat: 4.048, deliveryLng: 9.692 },
    { id: 'MDZ-2024-003', clientName: 'André Biya', clientPhone: '+237 677 100 003', receiverName: 'Claire Tong', receiverPhone: '+237 677 200 003', pickupAddress: 'Bassa, Quartier Industriel', deliveryAddress: 'Kotto, Rue de la Paix', pickupCity: 'Douala', deliveryCity: 'Douala', orderType: 'local' as const, serviceSpeed: 'normal' as const, packageType: 'Document', weight: 0.2, status: 'delivered' as const, courierId: 'courier-2', courierName: 'Paul Mvondo', amount: 2000, pickupLat: 4.042, pickupLng: 9.685, deliveryLat: 4.055, deliveryLng: 9.708 },
    { id: 'MDZ-2024-004', clientName: 'Fatima Njoya', clientPhone: '+237 677 100 004', receiverName: 'Ibrahim Sali', receiverPhone: '+237 677 200 004', pickupAddress: 'Bafoussam, Marché A', deliveryAddress: 'Yaoundé, Mvog-Mbi', pickupCity: 'Bafoussam', deliveryCity: 'Yaoundé', orderType: 'intercity' as const, serviceSpeed: 'express' as const, packageType: 'Colis moyen (5-20kg)', weight: 8, status: 'pending' as const, amount: 7600, pickupLat: 5.476, pickupLng: 10.418, deliveryLat: 3.848, deliveryLng: 11.502 },
    { id: 'MDZ-2024-005', clientName: 'Roger Nkoa', clientPhone: '+237 677 100 005', receiverName: 'Bernadette Eto', receiverPhone: '+237 677 200 005', pickupAddress: 'Deido, Rue des Manguiers', deliveryAddress: 'Akwa, Boulevard de la Liberté', pickupCity: 'Douala', deliveryCity: 'Douala', orderType: 'local' as const, serviceSpeed: 'normal' as const, packageType: 'Petit colis (< 5kg)', weight: 1, status: 'delivered' as const, courierId: 'courier-4', courierName: 'Carine Belo', amount: 2000, pickupLat: 4.055, pickupLng: 9.695, deliveryLat: 4.048, deliveryLng: 9.692 },
  ]

  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        ...o,
        events: {
          create: [
            { status: 'pending', message: 'Commande reçue et confirmée', location: o.pickupCity || 'Cameroun' },
            ...(o.status !== 'pending' ? [{ status: o.status, message: o.status === 'delivered' ? 'Colis livré avec succès ✅' : 'Statut mis à jour', location: o.deliveryCity || o.pickupCity || 'Cameroun' }] : []),
          ]
        }
      }
    })
  }

  console.log('✅ Seed terminé !')
  console.log('📧 Admin : admin@mydropzone.cm / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
