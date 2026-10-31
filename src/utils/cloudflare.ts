export function getCloudflareUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_R2_URL}${path}`;
}

