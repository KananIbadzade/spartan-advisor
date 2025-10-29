import { Badge } from '@/components/ui/badge';
import { GraduationCap, UserCog, Shield, Clock } from 'lucide-react';

interface RoleBadgeProps {
  role: 'student' | 'advisor' | 'admin';
  status?: 'active' | 'pending' | 'denied';
}

const RoleBadge = ({ role, status = 'active' }: RoleBadgeProps) => {
  const getIcon = () => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-3 h-3" />;
      case 'advisor':
        return <UserCog className="w-3 h-3" />;
      case 'admin':
        return <Shield className="w-3 h-3" />;
    }
  };

  const getVariant = () => {
    if (status === 'pending') return 'outline';
    if (status === 'denied') return 'destructive';
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'advisor':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getLabel = () => {
    const baseLabel = role.charAt(0).toUpperCase() + role.slice(1);
    if (status === 'pending') return `${baseLabel} (Pending)`;
    if (status === 'denied') return `${baseLabel} (Denied)`;
    return baseLabel;
  };

  return (
    <Badge variant={getVariant()} className="gap-1">
      {status === 'pending' ? <Clock className="w-3 h-3" /> : getIcon()}
      {getLabel()}
    </Badge>
  );
};

export default RoleBadge;
