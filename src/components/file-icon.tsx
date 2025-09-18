
import type { FC } from 'react';
import { File, Folder, FileImage, FileVideo, FileAudio, FileText, Archive, FileCode, LucideProps } from 'lucide-react';
import type { FileItem } from '@/lib/types';

interface FileIconProps {
  item: FileItem;
  className?: string;
}

const fileTypeIcons: { [key: string]: React.ElementType<LucideProps> } = {
  // Images
  'image/jpeg': FileImage,
  'image/png': FileImage,
  'image/gif': FileImage,
  'image/svg+xml': FileImage,
  'image/webp': FileImage,
  // Videos
  'video/mp4': FileVideo,
  'video/mpeg': FileVideo,
  'video/quicktime': FileVideo,
  // Audios
  'audio/mpeg': FileAudio,
  'audio/wav': FileAudio,
  'audio/ogg': FileAudio,
  // Documents
  'application/pdf': FileText,
  'text/plain': FileText,
  'text/csv': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.ms-powerpoint': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FileText,
  'application/vnd.ms-excel': FileText,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileText,
  // Archives
  'application/zip': Archive,
  'application/x-rar-compressed': Archive,
  'application/x-7z-compressed': Archive,
  // Code
  'text/html': FileCode,
  'text/css': FileCode,
  'text/javascript': FileCode,
  'application/json': FileCode,
};

const FileIcon: FC<FileIconProps> = ({ item, className }) => {
  if (item.type === 'folder') {
    return <Folder className={className} />;
  }

  const IconComponent = item.metadata?.contentType ? fileTypeIcons[item.metadata.contentType] || File : File;

  return <IconComponent className={className} />;
};

export default FileIcon;

    