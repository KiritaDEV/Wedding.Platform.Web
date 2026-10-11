export const sectionMotionOwnerId = (sectionId: string) => `section:${sectionId}`;
export const elementMotionOwnerId = (elementId: string) => `element:${elementId}`;
export const rsvpMotionOwnerId = (sectionId: string) => `specialized:${sectionId}:rsvp-form`;
export const galleryItemsMotionOwnerId = (sectionId: string) => `specialized:${sectionId}:gallery-items`;
export const galleryItemMotionOwnerId = (sectionId: string, itemId: string) => `specialized:${sectionId}:gallery-item:${itemId}`;
