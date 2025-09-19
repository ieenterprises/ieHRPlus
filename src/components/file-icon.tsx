
import type { FC } from 'react';
import { File, Folder, FileImage, FileVideo, FileAudio, FileText, Archive, FileCode, LucideProps } from 'lucide-react';
import type { FileItem } from '@/lib/types';

interface FileIconProps {
  item: {
      type: 'file' | 'folder';
      name: string;
      metadata: {
          contentType?: string;
          // other metadata fields can be optional as they are not always available
          size: number;
          updated: string;
          timeCreated: string;
      }
  };
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
  'video/webm': FileVideo,
  // Audios
  'audio/mpeg': FileAudio,
  'audio/wav': FileAudio,
  'audio/ogg': FileAudio,
  'audio/mp3': FileAudio,
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

// Function to get icon based on file extension as a fallback
const getIconByExtension = (fileName: string): React.ElementType<LucideProps> => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'svg':
            return FileImage;
        case 'mp4':
        case 'mov':
        case 'avi':
        case 'webm':
            return FileVideo;
        case 'mp3':
        case 'wav':
        case 'ogg':
            return FileAudio;
        case 'pdf':
        case 'txt':
        case 'doc':
        case 'docx':
        case 'ppt':
        case 'pptx':
        case 'xls':
        case 'xlsx':
            return FileText;
        case 'zip':
        case 'rar':
        case '7z':
            return Archive;
        case 'html':
        case 'css':
        case 'js':
        case 'json':
            return FileCode;
        default:
            return File;
    }
};

export const FileIcon: FC<FileIconProps> = ({ item, className }) => {
  if (item.type === 'folder') {
    return <Folder className={className} />;
  }

  const IconComponent = (item.metadata?.contentType && fileTypeIcons[item.metadata.contentType]) || getIconByExtension(item.name);

  return <IconComponent className={className} />;
};
