'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  fullName: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  pm: 'Property Manager',
  pm_staff: 'PM Staff',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  staff: 'bg-gray-100 text-gray-800',
  pm: 'bg-purple-100 text-purple-800',
  pm_staff: 'bg-purple-50 text-purple-700',
}

export function UserManager({ initial }: { initial: UserProfile[] }) {
  const [users, setUsers] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [tempPwDialog, setTempPwDialog] = useState<{ email: string; password: string } | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('staff')
  const [phone, setPhone] = useState('')

  function openCreate() {
    setEditing(null)
    setEmail('')
    setFullName('')
    setRole('staff')
    setPhone('')
    setSheetOpen(true)
  }

  function openEdit(u: UserProfile) {
    setEditing(u)
    setEmail(u.email)
    setFullName(u.fullName)
    setRole(u.role)
    setPhone(u.phone || '')
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!fullName.trim()) { toast.error('Full name is required'); return }
    setSaving(true)

    try {
      if (editing) {
        const res = await fetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, role, phone }),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
        toast.success('User updated')
      } else {
        if (!email.trim()) { toast.error('Email is required'); setSaving(false); return }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName, role, phone }),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
        const created = await res.json()
        const { tempPassword, ...profile } = created
        setUsers(prev => [...prev, profile])
        setTempPwDialog({ email: profile.email, password: tempPassword })
        toast.success('User created')
      }
      setSheetOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: UserProfile) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const updated = await res.json()
      setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))
      toast.success(updated.isActive ? 'User activated' : 'User deactivated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage user accounts and roles
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add User
        </Button>
      </div>

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users yet
                </TableCell>
              </TableRow>
            )}
            {users.map(u => (
              <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] || ROLE_COLORS.staff}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'default' : 'secondary'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(u)}
                      className={u.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-700'}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit User' : 'Add User'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {!editing && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="pm">Property Manager</SelectItem>
                  <SelectItem value="pm_staff">PM Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
              {saving ? 'Saving...' : editing ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Temp password dialog */}
      <Dialog open={!!tempPwDialog} onOpenChange={() => setTempPwDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created</DialogTitle>
            <DialogDescription>
              Share the temporary password with the user. They should change it after their first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium">{tempPwDialog?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-3 py-1.5 rounded text-sm font-mono flex-1">
                  {tempPwDialog?.password}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (tempPwDialog) {
                      navigator.clipboard.writeText(tempPwDialog.password)
                      toast.success('Copied to clipboard')
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPwDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
