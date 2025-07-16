import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Users, Plus, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingFamilySetupProps {
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface FamilyMember {
  name: string;
  role: string;
  learning_level: string;
  age?: number;
}

const ROLES = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teenager' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other Family Member' }
];

const LEVELS = [
  { value: 'beginner', label: 'Beginner (No Spanish)' },
  { value: 'elementary', label: 'Elementary (Basic words)' },
  { value: 'intermediate', label: 'Intermediate (Conversations)' },
  { value: 'advanced', label: 'Advanced (Fluent)' }
];

export const OnboardingFamilySetup = ({ onComplete, onNext, onPrevious }: OnboardingFamilySetupProps) => {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: '', role: 'parent', learning_level: 'beginner', age: undefined }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addMember = () => {
    console.log('Adding family member...');
    setFamilyMembers(prev => [...prev, { name: '', role: 'child', learning_level: 'beginner', age: undefined }]);
    console.log('Family members after add:', familyMembers);
  };

  const removeMember = (index: number) => {
    if (familyMembers.length > 1) {
      setFamilyMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string | number) => {
    setFamilyMembers(prev => 
      prev.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    );
  };

  const saveFamilyMembers = async () => {
    if (!user) return false;

    // Validate that at least one member has a name
    const validMembers = familyMembers.filter(member => member.name.trim());
    if (validMembers.length === 0) {
      toast.error('Please add at least one family member');
      return false;
    }

    setIsLoading(true);
    try {
      // Insert family members
      const { error } = await supabase
        .from('family_members')
        .insert(
          validMembers.map(member => ({
            user_id: user.id,
            name: member.name.trim(),
            role: member.role,
            learning_level: member.learning_level,
            age: member.age
          }))
        );

      if (error) throw error;

      toast.success(`Added ${validMembers.length} family member${validMembers.length > 1 ? 's' : ''}`);
      return true;
    } catch (error) {
      console.error('Error saving family members:', error);
      toast.error('Failed to save family members');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    const success = await saveFamilyMembers();
    if (success) {
      onComplete();
      onNext();
    }
  };

  const handleSkip = () => {
    onComplete();
    onNext();
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
          Set Up Your Family
        </CardTitle>
        <CardDescription className="text-lg">
          Add family members who will be learning Spanish together. Each person can have their own learning level and goals.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-[hsl(var(--espaluz-primary))]/10 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 text-[hsl(var(--espaluz-primary))]">Why family setup matters:</h4>
          <ul className="text-sm space-y-1">
            <li>• Personalized lessons for each family member's level</li>
            <li>• Family challenges and shared progress tracking</li>
            <li>• Age-appropriate content and conversation topics</li>
          </ul>
        </div>

        {familyMembers.map((member, index) => (
          <div key={index} className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Family Member {index + 1}</span>
              </div>
              {familyMembers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`name-${index}`}>Name *</Label>
                <Input
                  id={`name-${index}`}
                  placeholder="Enter name"
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor={`age-${index}`}>Age (optional)</Label>
                <Input
                  id={`age-${index}`}
                  type="number"
                  placeholder="Age"
                  value={member.age || ''}
                  onChange={(e) => updateMember(index, 'age', parseInt(e.target.value) || undefined)}
                />
              </div>

              <div>
                <Label htmlFor={`role-${index}`}>Family Role</Label>
                <Select value={member.role} onValueChange={(value) => updateMember(index, 'role', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`level-${index}`}>Spanish Level</Label>
                <Select value={member.learning_level} onValueChange={(value) => updateMember(index, 'learning_level', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addMember}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Family Member
        </Button>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={isLoading}
              className="bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
            >
              {isLoading ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};