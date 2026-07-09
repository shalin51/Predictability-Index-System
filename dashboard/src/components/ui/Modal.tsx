import type { CSSProperties, ReactNode } from 'react';

interface ModalProps {
  ariaLabel: string;
  children: ReactNode;
  maxWidth?: CSSProperties['maxWidth'];
}

export function Modal({ ariaLabel, children, maxWidth = 720 }: ModalProps) {
  return (
    <div className="ui-modal" role="presentation">
      <div aria-label={ariaLabel} aria-modal="true" className="ui-modal__panel" role="dialog" style={{ maxWidth }} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children }: { children: ReactNode }) {
  return <div className="ui-modal__header">{children}</div>;
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="ui-modal__body">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="ui-modal__footer">{children}</div>;
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <h2 className="ui-modal__title">{children}</h2>;
}
