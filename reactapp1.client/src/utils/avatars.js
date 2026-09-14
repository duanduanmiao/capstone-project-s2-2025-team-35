export const BUCKET_BASE =
  "https://capstone-team35-images.s3.ap-southeast-2.amazonaws.com/user-avatars";

export function getAvatarUrl(userId) {
  const idx = ((userId - 1) % 40) + 1; // 1..40
  return `${BUCKET_BASE}/${userId}/${idx}.png`;
}
