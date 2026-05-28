type LogoProps = {
  className?: string;
};

export default function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`flex items-baseline text-xl font-bold tracking-tight ${className}`.trim()}
    >
      <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
        Bizvora
      </span>
      <span className="ml-1.5 text-zinc-900 dark:text-white">One</span>
      <span
        aria-hidden
        className="ml-0.5 h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-linear-to-br from-primary to-secondary"
      />
    </span>
  );
}
