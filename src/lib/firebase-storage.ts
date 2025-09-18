
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
export async function listItems(businessId: string, path: string): Promise<FileItem[]> {
    const fullPath = [businessId, path].filter(Boolean).join('/');
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
                }
            } as FileItem;
        });

        const folderPromises = res.prefixes.map(async (folderRef) => {
            // Folders are just prefixes, we can't reliably get metadata for them
            // like we do for files. We'll construct a synthetic metadata object.
            // A more robust solution might involve storing folder metadata in Firestore
            // if more properties are needed in the future.
            return {
                name: folderRef.name,
                type: 'folder',
                 metadata: {
                    size: 0,
                    contentType: 'inode/directory',
                    // We can't get updated/created time for a prefix, so use a placeholder
                    updated: new Date().toISOString(),
                    timeCreated: new Date().toISOString(),
                }
            } as FileItem;
        });

        const [files, folders] = await Promise.all([Promise.all(itemsPromises), Promise.all(folderPromises)]);
        
        return [...folders, ...files].filter(item => !item.name.endsWith('.emptyFolderPlaceholder'));

    } catch (error) {
        console.error("Error listing files:", error);
        // Firebase returns an error if the folder doesn't exist, which is fine.
        // We just return an empty array.
        return [];
    }
}

// 2. Create a new folder
export async function createFolder(businessId: string, path: string) {
    const fullPath = `${businessId}/${path}/.emptyFolderPlaceholder`;
    const folderRef = ref(storage, fullPath);
    await uploadBytesResumable(folderRef, new Blob(['']));
}

// 3. Upload a file
export function uploadFile(
    businessId: string,
    path: string,
    file: File,
    onProgress: (progress: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const fullPath = [businessId, path, file.name].filter(Boolean).join('/');
        const storageRef = ref(storage, fullPath);
        const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
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
export async function deleteItem(businessId: string, item: FileItem, currentPath: string) {
    const itemPath = [businessId, currentPath, item.name].filter(Boolean).join('/');
    const itemRef = ref(storage, itemPath);

    if (item.type === 'folder') {
        const allItemsInFolder = await listAllRecursive(itemRef);
        const deletePromises = allItemsInFolder.map(fileRef => deleteObject(fileRef));
        // Also delete the placeholder if it exists (for empty folders)
        const placeholderRef = ref(storage, `${itemPath}/.emptyFolderPlaceholder`);
        deletePromises.push(deleteObject(placeholderRef).catch(() => {})); // Ignore error if it doesn't exist
        
        await Promise.all(deletePromises);
    } else {
        await deleteObject(itemRef);
    }
}

// Helper to copy a single file
async function copyFile(fromRef: any, toRef: any) {
    const downloadUrl = await getDownloadURL(fromRef);
    // Fetch the file as a blob
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    // Upload the blob to the new location
    await uploadBytesResumable(toRef, blob);
}

// 5. Rename an item
export async function renameItem(businessId: string, item: FileItem, newName: string, currentPath: string) {
    const fromPath = [businessId, currentPath, item.name].filter(Boolean).join('/');
    const toPath = [businessId, currentPath, newName].filter(Boolean).join('/');

    if (item.type === 'folder') {
        // Move folder contents
        await moveItem(businessId, fromPath, toPath, true);
    } else {
        // Move a single file
        await moveItem(businessId, fromPath, toPath, false);
    }
}


// 6. Get public URL for a file
export async function getPublicUrl(businessId: string, path: string): Promise<string> {
    const fullPath = [businessId, path].filter(Boolean).join('/');
    const fileRef = ref(storage, fullPath);
    return getDownloadURL(fileRef);
}


// 7. Move an item
export async function moveItem(businessId: string, fromPath: string, toPath: string, isFolder: boolean) {
    const fromRef = ref(storage, fromPath);
    
    if (!isFolder) {
        const toRef = ref(storage, toPath);
        await copyFile(fromRef, toRef);
        await deleteObject(fromRef);
    } else {
        const allFiles = await listAllRecursive(fromRef);
        // Also handle the placeholder for potentially empty folders
        const placeholderRef = ref(storage, `${fromPath}/.emptyFolderPlaceholder`);
        try {
            await getMetadata(placeholderRef);
            allFiles.push(placeholderRef);
        } catch(e) { /* placeholder doesn't exist, that's fine */ }


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
export async function copyItem(businessId: string, fromPath: string, toPath: string, isFolder: boolean) {
    const fromRef = ref(storage, fromPath);

    if (!isFolder) {
        const toRef = ref(storage, toPath);
        await copyFile(fromRef, toRef);
    } else {
        const allFiles = await listAllRecursive(fromRef);
         // Also handle the placeholder for potentially empty folders
        const placeholderRef = ref(storage, `${fromPath}/.emptyFolderPlaceholder`);
        try {
            await getMetadata(placeholderRef);
            allFiles.push(placeholderRef);
        } catch(e) { /* placeholder doesn't exist */ }

        for (const fileRef of allFiles) {
            const relativePath = fileRef.fullPath.substring(fromRef.fullPath.length);
            const newPath = `${toPath}${relativePath}`;
            const newFileRef = ref(storage, newPath);
            await copyFile(fileRef, newFileRef);
        }
    }
}

    