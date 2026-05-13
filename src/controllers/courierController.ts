import { Request, Response } from 'express'
import prisma from '../lib/prisma'

export async function getCouriers(req: Request, res: Response) {
  const couriers = await prisma.courier.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(couriers)
}

export async function getCourier(req: Request, res: Response) {
  const courier = await prisma.courier.findUnique({ where: { id: req.params.id } })
  if (!courier) return res.status(404).json({ message: 'Livreur introuvable' })
  return res.json(courier)
}

export async function createCourier(req: Request, res: Response) {
  const { name, phone, zone, vehicle } = req.body
  if (!name || !phone || !zone) return res.status(400).json({ message: 'Nom, téléphone et zone requis' })

  const courier = await prisma.courier.create({
    data: { name, phone, zone, vehicle: vehicle || 'moto' }
  })
  return res.status(201).json(courier)
}

export async function updateCourierLocation(req: Request, res: Response) {
  const { id } = req.params
  const { lat, lng } = req.body
  const courier = await prisma.courier.update({
    where: { id },
    data: { currentLat: lat, currentLng: lng }
  })
  return res.json(courier)
}

export async function updateCourierStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body
  const courier = await prisma.courier.update({ where: { id }, data: { status } })
  return res.json(courier)
}
