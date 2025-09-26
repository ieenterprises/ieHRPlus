

import { getStorage, ref, listAll, uploadBytesResumable, getDownloadURL, deleteObject, getMetadata, updateMetadata, UploadTask } from "firebase/storage";
import { app } from "./firebase";
import { FileItem } from "./types";

const storage = getStorage(app);

// Helper to list all items recursively in a "folder"
async function listAllRecursive(folderRef: any): Promise<any[]> {
    const res = await listAll(folderRef);
    let items = res.items;

    for (const folder of res.prefixes) {
        const subItems = await listAllRecursive(folder);
        items.push(...subItems);
    }
    return items;
}

// 1. List items in a specific path
export async function listItems(businessId: string, userId: string, path: string): Promise<FileItem[]> {
    const fullPath = [businessId, 'user_files', userId, path].filter(Boolean).join('/');
    const listRef = ref(storage, fullPath);

    try {
        const res = await listAll(listRef);
        const itemsPromises = res.items.map(async (itemRef) => {
            const metadata = await getMetadata(itemRef);
            return {
                name: itemRef.name,
                type: 'file',
                metadata: {
                    size: metadata.size,
                    contentType: metadata.contentType,
                    updated: metadata.updated,
                    timeCreated: metadata.timeCreated,
                    customMetadata: metadata.customMetadata || {} // Ensure customMetadata is not undefined
                }
            } as FileItem;
        });

        const folderPromises = res.prefixes.map(async (folderRef) => {
            return {
                name: folderRef.name,
                type: 'folder',
                 metadata: {
                    size: 0,
                    contentType: 'inode/directory',
                    updated: new Date().toISOString(),
                    timeCreated: new Date().toISOString(),
                    customMetadata: {}
                }
            } as FileItem;
        });

        const [files, folders] = await Promise.all([Promise.all(itemsPromises), Promise.all(folderPromises)]);
        
        return [...folders, ...files].filter(item => !item.name.endsWith('.emptyFolderPlaceholder'));

    } catch (error) {
        console.error("Error listing files:", error);
        return [];
    }
}

// 2. Create a new folder
export async function createFolder(businessId: string, userId: string, path: string) {
    const fullPath = [businessId, 'user_files', userId, path, '.emptyFolderPlaceholder'].filter(Boolean).join('/');
    const folderRef = ref(storage, fullPath);
    await uploadBytesResumable(folderRef, new Blob(['']));
}

// 3. Upload a file - NOW ACCEPTS creatorId
export function uploadFile(
    businessId: string,
    targetUserId: string,
    path: string,
    file: File,
    creatorId: string,
    onProgress?: (progress: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const fullPath = [businessId, 'user_files', targetUserId, path, file.name].filter(Boolean).join('/');
        const storageRef = ref(storage, fullPath);

        const metadata = {
            customMetadata: {
                creatorId: creatorId // Store the ID of the user performing the upload
            }
        };

        const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(progress);
                }
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(new Error("Could not upload file."));
            },
            () => {
                resolve();
            }
        );
    });
}


// 4. Delete an item (file or folder)
export async function deleteItem(businessId: string, userId: string, item: FileItem, currentPath: string) {
    const itemPath = [businessId, 'user_files', userId, currentPath, item.name].filter(Boolean).join('/');
    const itemRef = ref(storage, itemPath);

    if (item.type === 'folder') {
        const allItemsInFolder = await listAllRecursive(itemRef);
        const deletePromises = allItemsInFolder.map(fileRef => deleteObject(fileRef));
        const placeholderRef = ref(storage, `${itemPath}/.emptyFolderPlaceholder`);
        deletePromises.push(deleteObject(placeholderRef).catch(() => {}));
        
        await Promise.all(deletePromises);
    } else {
        await deleteObject(itemRef);
    }
}

// Helper to copy a single file, preserving metadata
async function copyFile(fromRef: any, toRef: any) {
    const downloadUrl = await getDownloadURL(fromRef);
    const metadata = await getMetadata(fromRef);

    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    
    const newMetadata = {
        contentType: metadata.contentType,
        customMetadata: metadata.customMetadata,
    };
    
    await uploadBytesResumable(toRef, blob, newMetadata);
}

// 5. Rename an item
export async function renameItem(businessId: string, userId: string, item: FileItem, newName: string, currentPath: string) {
    const fromPath = [businessId, 'user_files', userId, currentPath, item.name].filter(Boolean).join('/');
    const toPath = [businessId, 'user_files', userId, currentPath, newName].filter(Boolean).join('/');
    
    await moveItem(businessId, userId, fromPath, toPath, item.type === 'folder');
}


// 6. Get public URL for a file
export async function getPublicUrl(businessId: string, path: string): Promise<string> {
    const fileRef = ref(storage, path);
    return getDownloadURL(fileRef);
}


// 7. Move an item
export async function moveItem(businessId: string, userId: string, fromPath: string, toPath: string, isFolder: boolean) {
    const fromRef = ref(storage, fromPath);
    
    if (!isFolder) {
        const toRef = ref(storage, toPath);
        await copyFile(fromRef, toRef);
        await deleteObject(fromRef);
    } else {
        const allFiles = await listAllRecursive(fromRef);
        const placeholderRef = ref(storage, `${fromPath}/.emptyFolderPlaceholder`);
        try {
            await getMetadata(placeholderRef);
            allFiles.push(placeholderRef);
        } catch(e) {}


        for (const fileRef of allFiles) {
            const relativePath = fileRef.fullPath.substring(fromRef.fullPath.length);
            const newPath = `${toPath}${relativePath}`;
            const newFileRef = ref(storage, newPath);
            await copyFile(fileRef, newFileRef);
            await deleteObject(fileRef);
        }
    }
}

// 8. Copy an item
export async function copyItem(businessId: string, userId: string, fromPath: string, toPath: string, isFolder: boolean) {
    const fromRef = ref(storage, fromPath);

    if (!isFolder) {
        const toRef = ref(storage, toPath);
        await copyFile(fromRef, toRef);
    } else {
        const allFiles = await listAllRecursive(fromRef);
        const placeholderRef = ref(storage, `${fromPath}/.emptyFolderPlaceholder`);
        try {
            await getMetadata(placeholderRef);
            allFiles.push(placeholderRef);
        } catch(e) {}

        for (const fileRef of allFiles) {
            const relativePath = fileRef.fullPath.substring(fromPath.fullPath.length);
            const newPath = `${toPath}${relativePath}`;
            const newFileRef = ref(storage, newPath);
            await copyFile(fileRef, newFileRef);
        }
    }
}
