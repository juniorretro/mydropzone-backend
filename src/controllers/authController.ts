import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

function signToken(user: { id: string; email: string; role: string; name: string; courierId?: string | null }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, courierId: user.courierId },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis' })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ message: 'Identifiants incorrects' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' })

  const token = signToken(user)
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, courierId: user.courierId } })
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' })
  return res.json({ id: user.id, email: user.email, role: user.role, name: user.name, courierId: user.courierId })
}
