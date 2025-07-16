import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  age?: number;
  learning_level: string;
  interests: string[];
  tone: string;
  spanish_preference: number;
  english_preference: number;
  name_variants: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const ROLE_OPTIONS = [
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teenager' },
  { value: 'adult', label: 'Adult' },
  { value: 'parent', label: 'Parent' },
  { value: 'elder', label: 'Elder' }
];

const TONE_OPTIONS = [
  { value: 'playful', label: 'Playful' },
  { value: 'patient', label: 'Patient' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'calm', label: 'Calm' }
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

export const FamilyMembersManager = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<FamilyMember>>({
    name: '',
    role: 'adult',
    age: undefined,
    learning_level: 'beginner',
    interests: [],
    tone: 'conversational',
    spanish_preference: 0.5,
    english_preference: 0.5,
    name_variants: [],
    is_active: true
  });

  useEffect(() => {
    if (user) {
      loadFamilyMembers();
    }
  }, [user]);

  const loadFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Error loading family members:', error);
      toast.error('Error loading family members');
    }
  };

  const saveFamilyMember = async () => {
    console.log('Attempting to save family member:', formData);
    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const memberData = {
        name: formData.name!,
        role: formData.role || 'adult',
        age: formData.age,
        learning_level: formData.learning_level || 'beginner',
        interests: Array.isArray(formData.interests) ? formData.interests : 
          formData.interests ? [formData.interests as any] : [],
        tone: formData.tone || 'conversational',
        spanish_preference: formData.spanish_preference || 0.5,
        english_preference: formData.english_preference || 0.5,
        name_variants: Array.isArray(formData.name_variants) ? formData.name_variants :
          formData.name_variants ? [formData.name_variants as any] : [],
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        user_id: user?.id!
      };

      if (editingMember) {
        const { error } = await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', editingMember.id);
        
        if (error) throw error;
        toast.success('Family member updated successfully');
      } else {
        const { error } = await supabase
          .from('family_members')
          .insert(memberData);
        
        if (error) throw error;
        toast.success('Family member added successfully');
      }

      await loadFamilyMembers();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving family member:', error);
      toast.error('Error saving family member');
    } finally {
      setLoading(false);
    }
  };

  const deleteFamilyMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Family member deleted');
      await loadFamilyMembers();
    } catch (error) {
      console.error('Error deleting family member:', error);
      toast.error('Error deleting family member');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'adult',
      age: undefined,
      learning_level: 'beginner',
      interests: [],
      tone: 'conversational',
      spanish_preference: 0.5,
      english_preference: 0.5,
      name_variants: [],
      is_active: true
    });
    setEditingMember(null);
  };

  const openEditDialog = (member: FamilyMember) => {
    setFormData({ ...member });
    setEditingMember(member);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleInterestsChange = (value: string) => {
    const interests = value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({ ...prev, interests }));
  };

  const handleVariantsChange = (value: string) => {
    const variants = value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({ ...prev, name_variants: variants }));
  };

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
            Family Members
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} size="sm" className="bg-[hsl(var(--espaluz-primary))]">
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Elena, Sofia, Carlos"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || undefined }))}
                      placeholder="25"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="learning_level">Learning Level</Label>
                    <Select value={formData.learning_level} onValueChange={(value: any) => setFormData(prev => ({ ...prev, learning_level: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="tone">Communication Tone</Label>
                  <Select value={formData.tone} onValueChange={(value: any) => setFormData(prev => ({ ...prev, tone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="spanish_pref">Spanish Preference ({Math.round((formData.spanish_preference || 0.5) * 100)}%)</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.spanish_preference || 0.5}
                      onChange={(e) => setFormData(prev => ({ ...prev, spanish_preference: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="english_pref">English Preference ({Math.round((formData.english_preference || 0.5) * 100)}%)</Label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.english_preference || 0.5}
                      onChange={(e) => setFormData(prev => ({ ...prev, english_preference: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="interests">Interests (comma-separated)</Label>
                  <Input
                    id="interests"
                    value={Array.isArray(formData.interests) ? formData.interests.join(', ') : ''}
                    onChange={(e) => handleInterestsChange(e.target.value)}
                    placeholder="e.g. cooking, travel, music, sports"
                  />
                </div>
                
                <div>
                  <Label htmlFor="variants">Name Variants (comma-separated)</Label>
                  <Input
                    id="variants"
                    value={Array.isArray(formData.name_variants) ? formData.name_variants.join(', ') : ''}
                    onChange={(e) => handleVariantsChange(e.target.value)}
                    placeholder="e.g. Elena, Лена, Lenka"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveFamilyMember} disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {familyMembers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No family members added yet</p>
            <p className="text-sm mt-1">Add family members to personalize your learning experience</p>
          </div>
        ) : (
          <div className="space-y-3">
            {familyMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{member.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {member.learning_level}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>Age: {member.age || 'N/A'}</span>
                    <span className="mx-2">•</span>
                    <span>Tone: {member.tone}</span>
                    <span className="mx-2">•</span>
                    <span>Spanish: {Math.round(member.spanish_preference * 100)}%</span>
                  </div>
                  {member.interests && member.interests.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Interests: {member.interests.join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(member)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFamilyMember(member.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};