import Image from "next/image";

export function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/logo.jpg" alt="Study Management" width={size} height={size} priority />;
}
