import type { ReactNode } from 'react';

/** Párrafos ayudantes reutilizables de la app */
export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={`section-title ${className}`}>{children}</h2>;
}

export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h3 className={`card-title ${className}`}>{children}</h3>;
}

export function Text({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`text ${className}`}>{children}</p>;
}

export function Button({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Link({
  children,
  className = '',
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`link ${className}`} {...props}>
      {children}
    </a>
  );
}
