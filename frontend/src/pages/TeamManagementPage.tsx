import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Users, Plus, Trash2, UserPlus, Share2, ChevronRight, Crown, Shield, User, Mail, X, Check, FolderOpen } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface Team {
  id: string
  name: string
  description: string
  owner_id: string
  created_at: string
  member_count: number
  user_role: string
}

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  joined_at: string
}

interface TeamInvite {
  id: string
  email: string
  status: string
  created_at: string
}

interface SharedProject {
  id: string
  name: string
  status: string
  permission: string
}

interface TeamDetail {
  id: string
  name: string
  description: string
  owner: {
    id: string
    email: string
    full_name: string
  }
  created_at: string
  members: TeamMember[]
  pending_invites: TeamInvite[]
  shared_projects: SharedProject[]
  is_owner: boolean
}

interface PendingInvite {
  invite_id: string
  team_id: string
  team_name: string
  invited_by: string
  created_at: string
}

interface UserProject {
  id: string
  name: string
}

export default function TeamManagementPage() {
  const { token, user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [userProjects, setUserProjects] = useState<UserProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [shareProjectId, setShareProjectId] = useState('')
  const [sharePermission, setSharePermission] = useState('view')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user has team access (Pro or Enterprise tier)
  const hasTeamAccess = user?.tier === 'enterprise' || user?.tier === 'pro' || user?.features?.verification
  const isEnterprise = user?.tier === 'enterprise'
  
  // Pro limits: 1 team, 3 members max. Enterprise: unlimited
  const maxTeams = isEnterprise ? Infinity : 1
  const maxMembers = isEnterprise ? Infinity : 3

  useEffect(() => {
    if (hasTeamAccess) {
      loadTeams()
      loadPendingInvites()
      loadUserProjects()
    }
  }, [hasTeamAccess])

  const loadTeams = async () => {
    try {
      const res = await fetch(`${API_BASE}/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setTeams(data)
      }
    } catch (err) {
      console.error('Error loading teams:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPendingInvites = async () => {
    try {
      const res = await fetch(`${API_BASE}/my-invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setPendingInvites(data)
      }
    } catch (err) {
      console.error('Error loading invites:', err)
    }
  }

  const loadUserProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setUserProjects(data.map((p: any) => ({ id: p.id, name: p.name })))
      }
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const loadTeamDetails = async (teamId: string) => {
    try {
      const res = await fetch(`${API_BASE}/teams/${teamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedTeam(data)
      }
    } catch (err) {
      console.error('Error loading team details:', err)
    }
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setError('Team name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTeamName, description: newTeamDesc })
      })
      
      if (res.ok) {
        setShowCreateModal(false)
        setNewTeamName('')
        setNewTeamDesc('')
        loadTeams()
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to create team')
      }
    } catch (err) {
      setError('Failed to create team')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      })
      
      const data = await res.json()
      if (res.ok) {
        setShowInviteModal(false)
        setInviteEmail('')
        loadTeamDetails(selectedTeam.id)
        alert(data.added_directly ? 'Member added!' : 'Invitation sent!')
      } else {
        setError(data.detail || 'Failed to invite member')
      }
    } catch (err) {
      setError('Failed to invite member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShareProject = async () => {
    if (!shareProjectId || !selectedTeam) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ project_id: shareProjectId, permission: sharePermission })
      })
      
      if (res.ok) {
        setShowShareModal(false)
        setShareProjectId('')
        loadTeamDetails(selectedTeam.id)
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to share project')
      }
    } catch (err) {
      setError('Failed to share project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`${API_BASE}/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        loadPendingInvites()
        loadTeams()
      }
    } catch (err) {
      console.error('Error accepting invite:', err)
    }
  }

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`${API_BASE}/invites/${inviteId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        loadPendingInvites()
      }
    } catch (err) {
      console.error('Error declining invite:', err)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !confirm('Remove this member from the team?')) return

    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        loadTeamDetails(selectedTeam.id)
      }
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!selectedTeam) return

    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })
      
      if (res.ok) {
        loadTeamDetails(selectedTeam.id)
      }
    } catch (err) {
      console.error('Error updating role:', err)
    }
  }

  const handleUnshareProject = async (projectId: string) => {
    if (!selectedTeam || !confirm('Remove this project from the team?')) return

    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        loadTeamDetails(selectedTeam.id)
      }
    } catch (err) {
      console.error('Error unsharing project:', err)
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam || !confirm('Are you sure you want to delete this team? This action cannot be undone.')) return

    try {
      const res = await fetch(`${API_BASE}/teams/${selectedTeam.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        setSelectedTeam(null)
        loadTeams()
      }
    } catch (err) {
      console.error('Error deleting team:', err)
    }
  }

  // Upgrade prompt for free users
  if (!hasTeamAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-600 mb-6">
            Create teams, invite collaborators, and share projects. Team management is available on Pro and Enterprise plans.
          </p>
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-gray-900 mb-2">Plan Features:</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pro Plan</span>
                <span className="text-purple-600">1 team, 3 members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Enterprise Plan</span>
                <span className="text-purple-600">Unlimited teams & members</span>
              </div>
            </div>
          </div>
          <Link
            to="/pricing"
            className="block w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Upgrade Now
          </Link>
          <Link
            to="/dashboard"
            className="block w-full mt-3 text-gray-600 hover:text-gray-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Check if user can create more teams (Pro: 1 team limit)
  const canCreateTeam = isEnterprise || teams.filter(t => t.user_role === 'owner').length < maxTeams

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Team Management
              </h1>
              {!isEnterprise && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  Pro: {teams.filter(t => t.user_role === 'owner').length}/{maxTeams} team
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEnterprise && (
                <Link
                  to="/pricing"
                  className="px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition text-sm font-medium"
                >
                  Upgrade for unlimited
                </Link>
              )}
              <button
                onClick={() => canCreateTeam ? setShowCreateModal(true) : alert('Pro plan allows 1 team. Upgrade to Enterprise for unlimited teams.')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  canCreateTeam 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" /> Create Team
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Pending Invites Banner */}
        {pendingInvites.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">Pending Team Invitations</h3>
            <div className="space-y-2">
              {pendingInvites.map(invite => (
                <div key={invite.invite_id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{invite.team_name}</p>
                    <p className="text-sm text-gray-500">Invited by {invite.invited_by}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite.invite_id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite.invite_id)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Your Teams</h2>
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : teams.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No teams yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-3 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Create your first team
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => loadTeamDetails(team.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition flex items-center justify-between ${
                        selectedTeam?.id === team.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{team.name}</p>
                          {team.user_role === 'owner' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{team.member_count} member{team.member_count !== 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <div className="space-y-6">
                {/* Team Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        {selectedTeam.name}
                        {selectedTeam.is_owner && <Crown className="w-5 h-5 text-yellow-500" />}
                      </h2>
                      <p className="text-gray-600 mt-1">{selectedTeam.description || 'No description'}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Owner: {selectedTeam.owner?.full_name || selectedTeam.owner?.email}
                      </p>
                    </div>
                    {selectedTeam.is_owner && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteTeam}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Team"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Members Section */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Members ({selectedTeam.members.length + 1})</h3>
                      {!isEnterprise && selectedTeam.is_owner && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {selectedTeam.members.length + 1}/{maxMembers} max
                        </span>
                      )}
                    </div>
                    {selectedTeam.is_owner && (
                      <button
                        onClick={() => {
                          const currentMembers = selectedTeam.members.length + 1 // +1 for owner
                          if (!isEnterprise && currentMembers >= maxMembers) {
                            alert(`Pro plan allows ${maxMembers} members per team. Upgrade to Enterprise for unlimited members.`)
                          } else {
                            setShowInviteModal(true)
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg transition text-sm flex items-center gap-1 ${
                          isEnterprise || selectedTeam.members.length + 1 < maxMembers
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-300 text-gray-500'
                        }`}
                      >
                        <UserPlus className="w-4 h-4" /> Invite
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {/* Owner */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedTeam.owner?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{selectedTeam.owner?.email}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Owner</span>
                    </div>
                    
                    {/* Members */}
                    {selectedTeam.members.map(member => (
                      <div key={member.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            member.role === 'admin' ? 'bg-purple-100' : 'bg-gray-100'
                          }`}>
                            {member.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-purple-600" />
                            ) : (
                              <User className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedTeam.is_owner && (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pending Invites */}
                  {selectedTeam.pending_invites.length > 0 && (
                    <div className="p-4 bg-gray-50 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Pending Invitations</p>
                      <div className="space-y-2">
                        {selectedTeam.pending_invites.map(invite => (
                          <div key={invite.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4" />
                              {invite.email}
                            </div>
                            <span className="text-yellow-600">Pending</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shared Projects Section */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Shared Projects ({selectedTeam.shared_projects.length})</h3>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" /> Share Project
                    </button>
                  </div>
                  {selectedTeam.shared_projects.length === 0 ? (
                    <div className="p-8 text-center">
                      <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No shared projects yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedTeam.shared_projects.map(project => (
                        <div key={project.id} className="p-4 flex items-center justify-between">
                          <div>
                            <Link
                              to={`/projects/${project.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600"
                            >
                              {project.name}
                            </Link>
                            <p className="text-sm text-gray-500">
                              Permission: <span className="capitalize">{project.permission}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleUnshareProject(project.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove from team"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Team</h3>
                <p className="text-gray-500">Choose a team from the list to view details and manage members</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Team</h3>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Product Development Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="What does this team work on?"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="colleague@company.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                If they already have an account, they'll be added immediately. Otherwise, they'll receive an invitation.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Project with Team</h3>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
                <select
                  value={shareProjectId}
                  onChange={(e) => setShareProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {userProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permission Level</label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowShareModal(false); setError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShareProject}
                disabled={isSubmitting || !shareProjectId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Sharing...' : 'Share Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
