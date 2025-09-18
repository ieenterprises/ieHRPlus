

export const fileManagementPermissions = {
    VIEW_FILES: { label: "View all files and folders" },
    UPLOAD_FILES: { label: "Upload files" },
    DOWNLOAD_FILES: { label: "Download files" },
    DELETE_FILES: { label: "Delete files and folders" },
    RENAME_FILES: { label: "Rename files and folders" },
    MOVE_FILES: { label: "Move files and folders" },
    SHARE_FILES: { label: "Share files with external users" },
    APPROVE_DOCUMENTS: { label: "Approve documents in a workflow" },
    MANAGE_WORKFLOWS: { label: "Create and manage approval workflows" },
};

export const teamManagementPermissions = {
    VIEW_USERS: { label: "View all users and their departments" },
    MANAGE_USERS: { label: "Add, edit, and remove users" },
    VIEW_DEPARTMENTS: { label: "View departments and their permissions" },
    MANAGE_DEPARTMENTS: { label: "Create, edit, and delete departments" },
};

export const settingsPermissions = {
    MANAGE_BRANCHES: { label: "Manage branches" },
    MANAGE_BILLING: { label: "Manage billing and subscription" },
    MANAGE_SECURITY: { label: "Manage security settings (e.g., access codes)" },
};

export type FileManagementPermission = keyof typeof fileManagementPermissions;
export type TeamManagementPermission = keyof typeof teamManagementPermissions;
export type SettingsPermission = keyof typeof settingsPermissions;

export type AnyPermission = FileManagementPermission | TeamManagementPermission | SettingsPermission;
    
