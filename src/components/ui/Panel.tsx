import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Eyebrow label rendered above the title, uppercase and dimmed. */
  eyebrow?: string;
  /** Panel title. Rendered with the display face. */
  title?: string;
  /** Optional content aligned to the right of the header (buttons, badges). */
  action?: React.ReactNode;
  /** Removes internal padding — useful when the child is a full-bleed chart. */
  flush?: boolean;
}

/**
 * Base surface for every grouped region of the interface.
 * Elevation is expressed through border + inner hairline, never through blurred shadows.
 */
export const Panel: React.FC<PanelProps> = ({
  eyebrow, title, action, flush = false, className = '', children, ...rest
}) => (
  <section className={`panel ${flush ? '' : 'p-5'} ${className}`} {...rest}>
    {(title || eyebrow || action) && (
      <header className={`flex items-start justify-between gap-4 ${flush ? 'p-5 pb-3' : 'mb-4'}`}>
        <div>
          {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
          {title && <h2 className="text-[19px] leading-6 text-bone">{title}</h2>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    {children}
  </section>
);

export default Panel;
