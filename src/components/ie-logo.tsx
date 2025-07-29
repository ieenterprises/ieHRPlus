import Image from 'next/image';
import { cn } from '@/lib/utils';

interface IELogoProps {
  className?: string;
}

export function IELogo({ className }: IELogoProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} data-ai-logo-container>
      <Image
        src="https://i.im.ge/2025/06/09/vewzUc.Company-Logo-3-1.th.png"
        alt="OrderFlow Logo"
        fill
        style={{ objectFit: 'contain' }}
        data-ai-hint="company logo"
        unoptimized={true}
      />
    </div>
  );
}
