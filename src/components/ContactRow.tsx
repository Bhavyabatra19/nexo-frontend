import { formatDistanceToNow } from 'date-fns';
import { type Contact, tagColors } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Globe, Linkedin, UserPlus } from 'lucide-react';

interface ContactRowProps {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
}

const sourceIconMap: Record<string, React.ElementType> = {
  google: Globe,
  linkedin: Linkedin,
  manual: UserPlus,
};

const ContactRow = ({ contact, isSelected, onClick }: ContactRowProps) => {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const lastContactedAgo = contact.lastContacted ? formatDistanceToNow(new Date(contact.lastContacted), {
    addSuffix: true,
  }) : '--';

  return (
    <div
      onClick={onClick}
      className={cn(
        'contact-row',
        isSelected && 'bg-accent border-l-2 border-l-primary'
      )}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">{contact.name}</span>
          {(() => { const SIcon = sourceIconMap[contact.source]; return SIcon ? <SIcon className="w-3 h-3 text-muted-foreground shrink-0" /> : null; })()}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{contact.title}</span>
          <span>·</span>
          <span className="truncate">{contact.company}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {contact.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              tagColors[tag] || 'bg-secondary text-muted-foreground'
            )}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Last contacted */}
      <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {lastContactedAgo}
      </div>
    </div>
  );
};

export default ContactRow;
