import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'subtle';
type ButtonSize = 'sm' | 'md';

interface CommonButtonProps {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

type ButtonAsButtonProps = CommonButtonProps & {
  as?: 'button';
  disabled?: boolean;
  href?: never;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  rel?: never;
  target?: never;
  title?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
};

type ButtonAsAnchorProps = CommonButtonProps & {
  as: 'a';
  disabled?: never;
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel'];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  title?: string;
  type?: never;
};

export type ButtonProps = ButtonAsAnchorProps | ButtonAsButtonProps;

function buttonClassName(size: ButtonSize, variant: ButtonVariant) {
  return `ui-button ui-button--${size} ui-button--${variant}`;
}

export function Button(props: ButtonProps) {
  const {
    children,
    size = 'md',
    variant = 'primary',
  } = props;

  const className = buttonClassName(size, variant);

  if (props.as === 'a') {
    const { href, onClick, rel, target, title } = props;
    return (
      <a className={className} href={href} onClick={onClick} rel={rel} target={target} title={title}>
        {children}
      </a>
    );
  }

  const { disabled = false, onClick, title, type = 'button' } = props;
  return (
    <button className={className} disabled={disabled} onClick={onClick} title={title} type={type}>
      {children}
    </button>
  );
}
